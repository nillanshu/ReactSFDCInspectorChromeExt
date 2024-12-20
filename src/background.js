chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSessionCookie') {
    const originalDomain = new URL(sender.tab.url).hostname;
    let domain;

    if (originalDomain.includes('sandbox')) {
      domain = originalDomain.replace(/\.sandbox\..*$/, '.sandbox.my.salesforce.com');
    } else {
      domain = originalDomain.replace(/\.develop\..*$/, '.develop.my.salesforce.com');
    }

    chrome.cookies.getAll({ domain }, (cookies) => {
      const sessionCookie = cookies.find(cookie => cookie.name === 'sid');
      if (sessionCookie) {
        sendResponse({ accessToken: sessionCookie.value });
      } else {
        sendResponse({ error: 'Session cookie not found' });
      }
    });

    return true; // Keep the listener async
  }

  if (request.action === 'getUserId') {
    const { instanceUrl, accessToken } = request;
    fetch(`${instanceUrl}/services/oauth2/userinfo`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.json())
      .then(data => {
        sendResponse({ userId: data.user_id });
      })
      .catch(error => {
        console.error('Error retrieving user ID:', error);
        sendResponse({ error: 'Error retrieving user ID.' });
      });

    return true; // Will respond asynchronously
  }

  if (request.action === 'deployFields') {
    (async () => {
      try {
        const response = await fetch(request.endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml',
            'SOAPAction': 'Create',
          },
          body: request.soapBody,
        });
        const responseText = await response.text();
        sendResponse({ success: true, response: responseText });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // Will respond asynchronously
  }

  if (request.action === 'deployFieldPermissions') {
    const { endpointUrl, soapBody } = request;

    fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'SOAPAction': 'Create',
      },
      body: soapBody,
    })
    .then(response => response.text())
    .then(responseText => {
      sendResponse({ success: true, response: responseText });
    })
    .catch(error => {
      sendResponse({ success: false, error: error.message });
    });

    return true; // Will respond asynchronously.
  }
});