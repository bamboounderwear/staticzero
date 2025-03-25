const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Helper: create a signed session token valid for 1 hour.
function createSessionToken(username) {
  const payload = {
    username,
    exp: Date.now() + 3600 * 1000 // expires in 1 hour
  };
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const secret = process.env.SESSION_SECRET;
  const signature = crypto.createHmac('sha256', secret)
                          .update(base64Payload)
                          .digest('hex');
  return `${base64Payload}.${signature}`;
}

exports.handler = async (event, context) => {
  console.log("Auth function triggered");
  
  if (event.httpMethod !== 'POST') {
    console.log("Invalid HTTP method:", event.httpMethod);
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    console.log("Received event body:", event.body);
    const { username, password } = JSON.parse(event.body);

    const storedUsername = process.env.USERNAME;
    const storedPasswordHash = process.env.PASSWORD_HASH;
    const sessionSecret = process.env.SESSION_SECRET;

    if (!storedUsername || !storedPasswordHash || !sessionSecret) {
      throw new Error("Missing one or more required environment variables (USERNAME, PASSWORD_HASH, SESSION_SECRET)");
    }

    console.log(`Received username: "${username}" | Expected username: "${storedUsername}"`);

    if (username !== storedUsername) {
      console.log("Username mismatch");
      return { statusCode: 401, body: 'Unauthorized' };
    }

    const isMatch = await bcrypt.compare(password, storedPasswordHash);
    if (!isMatch) {
      console.log("Password mismatch");
      return { statusCode: 401, body: 'Unauthorized' };
    }

    const sessionToken = createSessionToken(username);
    console.log("Session token generated:", sessionToken);

    return {
      statusCode: 200,
      headers: {
        'Set-Cookie': `session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`
      },
      body: JSON.stringify({ message: 'Authenticated successfully!' })
    };
  } catch (error) {
    console.error("Error in auth function:", error);
    return { statusCode: 500, body: 'Internal Server Error: ' + error.message };
  }
};
