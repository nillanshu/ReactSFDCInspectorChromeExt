// src/background/background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSessionCookie') {
      const originalDomain = new URL(sender.tab.url).hostname;
      let domain;
  
      if (originalDomain.includes('sandbox')) {
        domain = originalDomain.replace(/\.sandbox\..*$/, '.sandbox.my.salesforce.com');
      } else {
        domain = originalDomain.replace(/\.develop\..*$/, '.develop.my.salesforce.com');
      }
  
      console.log(`Attempting to retrieve cookies for domain: ${domain}`);
      chrome.cookies.getAll({ domain }, (cookies) => {
        if (chrome.runtime.lastError) {
          console.error('Error accessing cookies:', chrome.runtime.lastError.message);
          sendResponse({ error: chrome.runtime.lastError.message });
          return;
        }
        const sessionCookie = cookies.find((cookie) => cookie.name === 'sid');
        if (sessionCookie) {
          sendResponse({ accessToken: sessionCookie.value });
        } else {
          sendResponse({ error: 'Session cookie not found' });
        }
      });
      return true;
    }
  });
  