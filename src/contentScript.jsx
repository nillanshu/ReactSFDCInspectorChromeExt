import { createRoot } from 'react-dom/client';
import React from 'react';
import App from './App';

console.log("Salesforce Inspector content script loaded");

function handleTabChange() {
  const urlPattern = /\.lightning\.force\.com\/lightning\/r\//;
  if (urlPattern.test(window.location.href)) {
    chrome.runtime.sendMessage({ action: 'getSessionCookie' }, (response) => {
      if (response.error) {
        console.error('Error getting session cookie:', response.error);
        return;
      }
      injectReactApp(response.accessToken);
    });
  } else {
    removeReactApp();
  }
}

function injectReactApp(accessToken) {
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
  root.render(<App accessToken={accessToken} />);
}

function removeReactApp() {
  const inspectorDiv = document.getElementById('key-fields-inspector');
  if (inspectorDiv) {
    inspectorDiv.remove();
  }
}

handleTabChange();
