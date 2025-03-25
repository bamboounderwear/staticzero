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
    #leads-container { margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; }
    th { background-color: #f2f2f2; }
    .download-btn { margin-right: 10px; padding: 8px 16px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to the Admin Panel</h1>
    <p>Access granted for <strong>${payload.username}</strong>.</p>
    <button class="logout" onclick="logout()">Logout</button>
    
    <h2>Leads</h2>
    <div id="leads-container">
      <!-- Leads will be loaded here -->
    </div>
    <div style="margin-top: 10px;">
      <button class="download-btn" onclick="downloadJSON()">Download JSON</button>
      <button class="download-btn" onclick="downloadCSV()">Download CSV</button>
    </div>
  </div>
  
  <script>
    async function loadLeads() {
      try {
        const response = await fetch('/.netlify/functions/leads');
        if (response.ok) {
          const leads = await response.json();
          console.log("Leads loaded:", leads); // Debug log
          displayLeads(leads);
        } else {
          console.error('Failed to load leads:', response.statusText);
          document.getElementById('leads-container').innerHTML = '<p>Error loading leads.</p>';
        }
      } catch (error) {
        console.error('Error loading leads:', error);
        document.getElementById('leads-container').innerHTML = '<p>Error loading leads.</p>';
      }
    }
    
    function displayLeads(leads) {
      const container = document.getElementById('leads-container');
      if (!leads || leads.length === 0) {
        container.innerHTML = '<p>No leads available.</p>';
        return;
      }
      
      // Debug: log the first lead to check its keys
      console.log("First lead keys:", Object.keys(leads[0]));
      
      let html = '<table><thead><tr>';
      // Get keys dynamically from the first lead
      const keys = Object.keys(leads[0]);
      keys.forEach(key => {
        let displayKey = key;
        if (key.toLowerCase() === 'timestamp') {
          displayKey = 'Submission Time';
        }
        html += '<th>' + displayKey + '</th>';
      });
      html += '</tr></thead><tbody>';
      
      leads.forEach(lead => {
        html += '<tr>';
        keys.forEach(key => {
          let value = lead[key];
          if (key.toLowerCase() === 'timestamp' && value) {
            try {
              value = new Date(value).toLocaleString();
            } catch(err) {
              console.error("Error formatting timestamp:", value, err);
            }
          }
          html += '<td>' + (value || '') + '</td>';
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
      container.innerHTML = html;
    }
    
    function downloadJSON() {
      fetch('/.netlify/functions/leads')
        .then(response => response.json())
        .then(leads => {
          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(leads, null, 2));
          const dlAnchorElem = document.createElement('a');
          dlAnchorElem.setAttribute("href", dataStr);
          dlAnchorElem.setAttribute("download", "leads.json");
          dlAnchorElem.click();
        })
        .catch(err => console.error('Error downloading JSON', err));
    }
    
    function downloadCSV() {
      fetch('/.netlify/functions/leads')
        .then(response => response.json())
        .then(leads => {
          if (!leads || leads.length === 0) {
            alert('No leads to download.');
            return;
          }
          const keys = Object.keys(leads[0]);
          let csv = keys.join(",") + "\\n";
          leads.forEach(lead => {
            csv += keys.map(key => {
              const value = lead[key] ? lead[key].toString() : "";
              return '"' + value.replace(/"/g, '""') + '"';
            }).join(",") + "\\n";
          });
          const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
          const dlAnchorElem = document.createElement('a');
          dlAnchorElem.setAttribute("href", dataStr);
          dlAnchorElem.setAttribute("download", "leads.csv");
          dlAnchorElem.click();
        })
        .catch(err => console.error('Error downloading CSV', err));
    }
    
    function logout() {
      fetch('/.netlify/functions/logout')
        .then(() => window.location.href = 'login.html')
        .catch(() => window.location.href = 'login.html');
    }
    
    document.addEventListener("DOMContentLoaded", loadLeads);
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
