exports.handler = async (event, context) => {
    return {
      statusCode: 200,
      headers: {
        'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Strict; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
      },
      body: JSON.stringify({ message: 'Logged out successfully' })
    };
  };
  