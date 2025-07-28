import { createRoot } from 'react-dom/client';
import React from 'react';
import App from './App';

console.log("Salesforce Inspector content script loaded");

function handleTabChange() {
  // More flexible URL pattern matching for Salesforce
  const salesforcePatterns = [
    /\.lightning\.force\.com/,
    /\.salesforce\.com/,
    /\.force\.com/
  ];
  
  const isSalesforceUrl = salesforcePatterns.some(pattern => pattern.test(window.location.href));
  
  console.log('Current URL:', window.location.href);
  console.log('Is Salesforce URL:', isSalesforceUrl);
  
  if (isSalesforceUrl) {
    chrome.runtime.sendMessage({ action: 'getSessionCookie' }, (response) => {
      if (response && response.error) {
        console.error('Error getting session cookie:', response.error);
        // Still inject the app even if session cookie fails, for debugging
        injectReactApp(null, null);
        return;
      }

      if (!response || !response.accessToken) {
        console.warn('No session cookie found, but injecting app for debugging');
        injectReactApp(null, null);
        return;
      }

      const accessToken = response.accessToken;
      const url = window.location.href;
      
      // Improved instance URL detection
      let instanceUrl;
      if (url.includes('.sandbox.')) {
        instanceUrl = url.match(/https:\/\/[^/]+\.sandbox\.[^/]+/)?.[0] || 
                     url.replace(/\.sandbox\..*$/, '.sandbox.my.salesforce.com');
      } else if (url.includes('.develop.')) {
        instanceUrl = url.match(/https:\/\/[^/]+\.develop\.[^/]+/)?.[0] || 
                     url.replace(/\.develop\..*$/, '.develop.my.salesforce.com');
      } else if (url.includes('.lightning.force.com')) {
        instanceUrl = url.match(/https:\/\/[^/]+\.lightning\.force\.com/)?.[0];
      } else {
        instanceUrl = url.match(/https:\/\/[^/]+\.(salesforce|force)\.com/)?.[0];
      }

      console.log('Instance URL detected:', instanceUrl);

      chrome.runtime.sendMessage(
        { action: 'getUserId', instanceUrl, accessToken },
        (userIdResponse) => {
          if (userIdResponse && userIdResponse.error) {
            console.error('Error getting user ID:', userIdResponse.error);
            // Still inject the app even if user ID fails
            injectReactApp(accessToken, null);
            return;
          }
          injectReactApp(accessToken, userIdResponse ? userIdResponse.userId : null);
        }
      );
    });
  } else {
    removeReactApp();
  }
}

function injectReactApp(accessToken, userId) {
  if (document.getElementById('key-fields-inspector')) {
    return;
  }
  
  const inspectorDiv = document.createElement('div');
  inspectorDiv.id = 'key-fields-inspector';
  inspectorDiv.style.position = 'fixed';
  inspectorDiv.style.top = '40%';
  inspectorDiv.style.zIndex = '99999999';
  document.body.appendChild(inspectorDiv);
  
  const root = createRoot(inspectorDiv);
  root.render(<App accessToken={accessToken} userId={userId} />);
}

function removeReactApp() {
  const inspectorDiv = document.getElementById('key-fields-inspector');
  if (inspectorDiv) {
    inspectorDiv.remove();
  }
}

handleTabChange();

// Listen for navigation changes in single-page applications
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('URL changed to:', url);
    // Delay to ensure page content is loaded
    setTimeout(handleTabChange, 1000);
  }
}).observe(document, {subtree: true, childList: true});

// Also listen for history changes
window.addEventListener('popstate', () => {
  console.log('History changed');
  setTimeout(handleTabChange, 1000);
});
