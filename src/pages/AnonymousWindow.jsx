import React, { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { executeAnonymous, queryApexLog, retrieveRawLogs } from '../api/executeAnonymous';

const AnonymousWindow = ({ accessToken, instanceUrl, userId }) => {
  const [apexCode, setApexCode] = useState('');
  const [result, setResult] = useState('');
  const [logs, setLogs] = useState([]);

  const handleExecute = async () => {
    if (!apexCode) {
      toast.error('Please enter Apex code to execute.');
      return;
    }

    try {
      const executionResult = await executeAnonymous(instanceUrl, accessToken, apexCode);
      setResult(executionResult.result);

      if (executionResult.result !== 'Execution successful.') {
        toast.error(executionResult.result);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      const logId = await queryApexLog(instanceUrl, accessToken, userId);
      if (logId) {
        const rawLogs = await retrieveRawLogs(instanceUrl, accessToken, logId);
        setLogs(prevLogs => [...prevLogs, rawLogs]);
        toast.success('Execution successful and logs retrieved.');
      } else {
        toast.warn('Execution successful but no logs found.');
      }
    } catch (error) {
      console.error('Error executing Apex code:', error);
      setResult('Error executing Apex code.');
      toast.error('Error executing Apex code.');
    }
  };

  const handleDownloadLogs = () => {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'apex_logs.txt';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="anonymous-window">
      <h2>Execute Anonymous Apex</h2>
      <div className="input-container">
        <textarea
          value={apexCode}
          onChange={(e) => setApexCode(e.target.value)}
          placeholder="Enter your Apex code here..."
          rows="10"
          cols="50"
        />
      </div>
      <div className="button-container">
        <button onClick={handleExecute}>Execute</button>
      </div>
      {result && (
        <div className="result-container">
          <h3>Result:</h3>
          <pre>{result}</pre>
        </div>
      )}
      {logs.length > 0 && (
        <div className="logs-container">
          <h3>Logs:</h3>
          <pre>{logs.join('\n')}</pre>
          <button onClick={handleDownloadLogs}>Download Logs</button>
        </div>
      )}
      <ToastContainer />
    </div>
  );
};

export default AnonymousWindow;