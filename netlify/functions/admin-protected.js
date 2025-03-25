const crypto = require('crypto');

function verifySessionToken(token) {
  const secret = process.env.SESSION_SECRET;
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const base64Payload = parts[0];
  const providedSignature = parts[1];
  const expectedSignature = crypto.createHmac('sha256', secret)
                                  .update(base64Payload)
                                  .digest('hex');
  if (providedSignature !== expectedSignature) return false;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));
  } catch (e) {
    return false;
  }
  // Check if token has expired.
  if (payload.exp < Date.now()) return false;
  return payload;
}

exports.handler = async (event, context) => {
  // Parse cookies from the incoming request.
  const cookieHeader = event.headers.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, value] = c.trim().split('=');
      return [key, value];
    })
  );
  const token = cookies.session;
  const payload = verifySessionToken(token);
  
  if (!payload) {
    // If verification fails, return a 401 Unauthorized response.
    return {
      statusCode: 401,
      body: 'Unauthorized'
    };
  }

  // If the session is valid, return the admin page HTML.
  const adminHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Admin Panel</title>
    <style>
      body { font-family: Arial, sans-serif; background: #fff; margin: 0; padding: 20px; }
      .container { max-width: 800px; margin: auto; }
      .logout { display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #4285F4; color: white; text-decoration: none; cursor: pointer; border: none; border-radius: 4px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Welcome to the Admin Panel</h1>
      <p>This is a protected area.</p>
      <button class="logout" onclick="logout()">Logout</button>
    </div>
    <script>
      function logout() {
        fetch('/.netlify/functions/logout')
          .then(() => window.location.href = 'login.html')
          .catch(() => window.location.href = 'login.html');
      }
    </script>
  </body>
  </html>
  `;
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html'
    },
    body: adminHtml
  };
};
