import { useEffect, useState } from 'react';

export function useSalesforceSession(accessToken) {
  const [keyFields, setKeyFields] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pathSegments = window.location.pathname.split('/');
    const objectApiName = pathSegments[pathSegments.length - 3];
    const recordId = pathSegments[pathSegments.length - 2];

    const instanceUrl = window.location.href.includes('sandbox')
      ? window.location.href.replace(/\.sandbox\..*$/, '.sandbox.my.salesforce.com')
      : window.location.href.replace(/\.develop\..*$/, '.develop.my.salesforce.com');

    fetch(`${instanceUrl}/services/data/v52.0/sobjects/${objectApiName}/${recordId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
      .then(response => response.json())
      .then(data => {
        if (data.errorCode === 'INVALID_SESSION_ID') {
          setError('Invalid session. Please log in again.');
        } else {
          const fields = Object.entries(data).map(([key, value]) => ({
            fieldName: key,
            fieldValue: typeof value === 'object' ? JSON.stringify(value) : value
          }));
          console.log('Inside useSalesforceSession');
          console.log('Fields:', fields);
          setKeyFields(fields);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Error fetching key fields.');
        setLoading(false);
      });
  }, [accessToken]);

  return { keyFields, error, loading };
}