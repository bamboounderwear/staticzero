const bcrypt = require('bcryptjs');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Parse the incoming JSON body (expects { username, password })
    const { username, password } = JSON.parse(event.body);

    // Retrieve credentials from environment variables
    const storedUsername = process.env.USERNAME;
    const storedPasswordHash = process.env.PASSWORD_HASH;

    // Check if the username matches
    if (username !== storedUsername) {
      return { statusCode: 401, body: 'Unauthorized' };
    }

    // Compare the provided password with the hashed password
    const isMatch = await bcrypt.compare(password, storedPasswordHash);
    if (!isMatch) {
      return { statusCode: 401, body: 'Unauthorized' };
    }

    // Authentication successful
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Authenticated successfully!' }),
    };
  } catch (error) {
    // Handle any errors
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};
