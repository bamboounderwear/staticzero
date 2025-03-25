const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Helper: create a signed session token valid for 1 hour.
function createSessionToken(username) {
  const payload = {
    username: username,
    exp: Date.now() + 3600 * 1000  // expires in 1 hour
  };
  // Encode the payload as base64.
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  // Use the SESSION_SECRET from environment variables to sign the payload.
  const secret = process.env.SESSION_SECRET;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(base64Payload)
    .digest('hex');
  // The final token is the payload and signature separated by a dot.
  return `${base64Payload}.${signature}`;
}

exports.handler = async (event, context) => {
  // Only allow POST requests.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Parse the incoming JSON body (expects { username, password }).
    const { username, password } = JSON.parse(event.body);

    // Retrieve credentials from environment variables.
    const storedUsername = process.env.USERNAME;
    const storedPasswordHash = process.env.PASSWORD_HASH;

    // Check if the username matches.
    if (username !== storedUsername) {
      return { statusCode: 401, body: 'Unauthorized' };
    }

    // Compare the provided password with the hashed password.
    const isMatch = await bcrypt.compare(password, storedPasswordHash);
    if (!isMatch) {
      return { statusCode: 401, body: 'Unauthorized' };
    }

    // Generate a secure, signed session token.
    const sessionToken = createSessionToken(username);

    // Return a 200 response with the token set in an HttpOnly, Secure cookie.
    return {
      statusCode: 200,
      headers: {
        'Set-Cookie': `session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`
      },
      body: JSON.stringify({ message: 'Authenticated successfully!' })
    };
  } catch (error) {
    // Handle any errors.
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};
