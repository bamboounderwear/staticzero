# Netlify Secure Leads Project

This project is a serverless application deployed on Netlify that provides secure authentication, an admin panel, and lead management using Netlify Functions and Blobs. Leads submitted via forms are stored, and administrators can view and download them in JSON or CSV formats.

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Deployment Instructions](#deployment-instructions)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)

## Overview

- **Secure Authentication:**  
  The application uses a serverless function (`auth.js`) to authenticate users. It compares the submitted credentials with environment variables and creates a signed session token stored in an HttpOnly, Secure cookie.

- **Protected Admin Panel:**  
  The admin panel is served via a protected Netlify Function (`admin-protected.js`). It verifies the session cookie before displaying stored leads.

- **Lead Management:**  
  Leads are managed using the `leads.ts` function, which allows you to store, list, and delete leads. Each lead automatically includes a timestamp indicating when it was submitted.

## Project Structure

```
.
├── netlify
│   └── functions
│       ├── auth.js             // Handles login and session creation
│       ├── admin-protected.js  // Serves the protected admin panel
│       ├── leads.ts            // Manages leads storage (GET, PUT, DELETE)
│       └── logout.js           // (Optional) Clears the session cookie
├── _redirects                // Routes /admin to the admin-protected function
├── login.html                // Public login page
└── README.md                 // Project documentation
```

## Environment Variables

In your Netlify site settings, add the following environment variables:

- **USERNAME:**  
  The username used for authentication (e.g., `admin`).

- **PASSWORD_HASH:**  
  A bcrypt-hashed version of the password.  
  **Tip:** Generate a hash using an online tool like [bcrypt-generator.com](https://bcrypt-generator.com/).

- **SESSION_SECRET:**  
  A secure, random string used to sign session tokens.  
  **Tip:** Use a password generator or Node’s crypto module locally to generate a secret.

Example values (do not use these in production):

```
USERNAME=admin
PASSWORD_HASH=$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36m1UR2Zs/...
SESSION_SECRET=your-very-secure-random-string
```

## Deployment Instructions

1. **Create/Clone the Repository:**  
   Fork or clone this repository to your GitHub (or other Git host).

2. **Push to GitHub:**  
   Ensure all project files (including the `netlify/functions` folder and `_redirects` file) are committed and pushed.

3. **Connect to Netlify:**  
   - Log in to [Netlify](https://app.netlify.com/).
   - Create a new site by connecting your GitHub repository.
   - During setup, Netlify will automatically detect your functions in the `netlify/functions` folder.

4. **Configure Environment Variables:**  
   In your Netlify dashboard, navigate to **Site Settings > Build & deploy > Environment** and add `USERNAME`, `PASSWORD_HASH`, and `SESSION_SECRET`.

5. **Deploy:**  
   Netlify will build and deploy your site automatically after each push. Your site and functions will be available at your Netlify URL.

6. **Set Up Redirects:**  
   The `_redirects` file should include a rule like the following to route `/admin` to your protected admin function:
   ```
   /admin  /.netlify/functions/admin-protected  200
   ```

## Usage

- **Login:**  
  Open the login page (e.g., `https://your-site.netlify.app/login.html`) and enter your credentials. On successful login, you will be redirected to `/admin`.

- **Admin Panel:**  
  The admin panel verifies your session and displays all leads stored via the `leads.ts` function. Leads are sorted so the newest (based on the `timestamp` field) appears first.  
  - **View Leads:**  
    Leads appear in a dynamically generated table.
  - **Download Leads:**  
    Use the provided buttons to download leads as JSON or CSV files.

- **Lead Submission:**  
  Leads can be submitted through a form (or via API requests) to the `leads.ts` function. Each lead automatically receives a submission timestamp if not provided by the client.

## Troubleshooting

- **No Timestamp Displayed in Table:**  
  - The table merges keys from all leads, so ensure that at least one lead includes a `timestamp` property.  
  - New leads submitted via the `leads.ts` function will include a timestamp automatically.

- **Session/Cookie Issues:**  
  - Ensure that your site is served over HTTPS.  
  - Use Netlify’s function logs (in the dashboard) to debug issues with token verification.

- **Function Logs:**  
  Check the Netlify function logs for detailed error messages if any function fails.