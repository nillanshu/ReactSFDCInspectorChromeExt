chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSessionCookie') {
    const originalDomain = new URL(sender.tab.url).hostname;
    console.log('Getting session cookie for domain:', originalDomain);
    
    // Try multiple domain variations to find session cookie
    const domainVariations = [];
    
    if (originalDomain.includes('sandbox')) {
      domainVariations.push(
        originalDomain.replace(/\.sandbox\..*$/, '.sandbox.my.salesforce.com'),
        originalDomain,
        originalDomain.replace(/^[^.]+\./, ''),
        '.salesforce.com'
      );
    } else if (originalDomain.includes('develop')) {
      domainVariations.push(
        originalDomain.replace(/\.develop\..*$/, '.develop.my.salesforce.com'),
        originalDomain,
        originalDomain.replace(/^[^.]+\./, ''),
        '.salesforce.com'
      );
    } else if (originalDomain.includes('lightning.force.com')) {
      domainVariations.push(
        originalDomain,
        originalDomain.replace(/^[^.]+\./, ''),
        '.force.com',
        '.salesforce.com'
      );
    } else {
      domainVariations.push(
        originalDomain,
        originalDomain.replace(/^[^.]+\./, ''),
        '.salesforce.com',
        '.force.com'
      );
    }

    console.log('Trying domains:', domainVariations);

    // Try each domain variation to find session cookie
    let foundCookie = false;
    
    const checkDomain = (index) => {
      if (index >= domainVariations.length || foundCookie) {
        if (!foundCookie) {
          console.warn('Session cookie not found on any domain');
          sendResponse({ error: 'Session cookie not found' });
        }
        return;
      }
      
      const domain = domainVariations[index];
      chrome.cookies.getAll({ domain }, (cookies) => {
        console.log(`Checking domain ${domain}, found ${cookies.length} cookies`);
        
        // Look for various session cookie names
        const sessionCookieNames = ['sid', 'oid', 'sessionid', 'session_id'];
        const sessionCookie = cookies.find(cookie => 
          sessionCookieNames.includes(cookie.name.toLowerCase()) ||
          cookie.name.startsWith('sid')
        );
        
        if (sessionCookie && !foundCookie) {
          foundCookie = true;
          console.log('Found session cookie:', sessionCookie.name, 'on domain:', domain);
          sendResponse({ accessToken: sessionCookie.value });
        } else {
          // Try next domain
          checkDomain(index + 1);
        }
      });
    };
    
    checkDomain(0);
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