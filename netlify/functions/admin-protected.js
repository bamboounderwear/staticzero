const crypto = require('crypto');

function verifySessionToken(token) {
  const secret = process.env.SESSION_SECRET;
  if (!token) {
    console.log("No session token provided");
    return false;
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    console.log("Invalid token format, parts:", parts);
    return false;
  }
  const base64Payload = parts[0];
  const providedSignature = parts[1];
  const expectedSignature = crypto.createHmac('sha256', secret)
                                  .update(base64Payload)
                                  .digest('hex');
  if (providedSignature !== expectedSignature) {
    console.log("Signature mismatch:", { providedSignature, expectedSignature });
    return false;
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));
  } catch (e) {
    console.log("Error parsing token payload:", e);
    return false;
  }
  if (payload.exp < Date.now()) {
    console.log("Token expired:", { exp: payload.exp, now: Date.now() });
    return false;
  }
  console.log("Token verified successfully:", payload);
  return payload;
}

exports.handler = async (event, context) => {
  console.log("Admin-protected function triggered");
  console.log("Request headers:", event.headers);
  
  const cookieHeader = event.headers.cookie || '';
  console.log("Cookie header:", cookieHeader);
  
  // Updated cookie parsing logic to handle "=" characters in cookie values.
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const parts = c.trim().split('=');
      const key = parts.shift();
      const value = parts.join('=');
      return [key, value];
    })
  );
  console.log("Parsed cookies:", cookies);
  
  const token = cookies.session;
  const payload = verifySessionToken(token);
  
  if (!payload) {
    console.log("Token verification failed. Sending 401.");
    return {
      statusCode: 401,
      body: 'Unauthorized'
    };
  }
  
  console.log("Token valid for user:", payload.username);
  
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
      <p>Access granted for <strong>${payload.username}</strong>.</p>
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
    headers: { 'Content-Type': 'text/html' },
    body: adminHtml
  };
};
