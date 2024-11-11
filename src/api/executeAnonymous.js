import axios from 'axios';

export async function executeAnonymous(instanceUrl, accessToken, apexCode) {
  try {
    const response = await axios({
      method: 'GET',
      url: `${instanceUrl}/services/data/v62.0/tooling/executeAnonymous/?anonymousBody=${encodeURIComponent(apexCode)}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const { compiled, success, compileProblem, exceptionMessage, exceptionStackTrace } = response.data;

    if (compiled && success) {
      return { result: 'Execution successful.' };
    } else {
      return { result: `Compile Problem: ${compileProblem}\nException Message: ${exceptionMessage}\nException Stack Trace: ${exceptionStackTrace}` };
    }
  } catch (error) {
    console.error('Error executing Apex code:', error);
    throw new Error('Error executing Apex code.');
  }
}

  export async function queryApexLog(instanceUrl, accessToken, userId) {
    const query = `SELECT Id FROM ApexLog WHERE Operation LIKE '%executeAnonymous%' AND LogUserId='${userId}' ORDER BY StartTime DESC LIMIT 1`;
  
    const maxRetries = 10; 
    const delay = 2000;
  
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get(
          `${instanceUrl}/services/data/v62.0/query/?q=${encodeURIComponent(query)}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
  
        if (response.data.records && response.data.records.length > 0) {
          return response.data.records[0].Id;
        } else {
          console.warn(`Attempt ${attempt}/${maxRetries}: No ApexLog records found yet. Retrying...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`Error querying ApexLog on attempt ${attempt}:`, error);
        throw new Error('Error querying ApexLog.');
      }
    }
  
    throw new Error('No ApexLog records found after multiple attempts.');
  }

export async function retrieveRawLogs(instanceUrl, accessToken, logId) {
  try {
    const response = await axios.get(
      `${instanceUrl}/services/data/v62.0/sobjects/ApexLog/${logId}/Body`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error retrieving raw logs:', error);
    throw new Error('Error retrieving raw logs.');
  }
}