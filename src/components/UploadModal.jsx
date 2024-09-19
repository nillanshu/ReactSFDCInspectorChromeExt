import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import axios from 'axios';
import Papa from 'papaparse';
import { getAllSobjects } from '../api/getSobjects';
import { getSObjectFields } from '../api/getFields';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function UploadModal({ accessToken }) {
  const [sObjects, setSObjects] = useState([]);
  const [instanceUrl, setInstanceUrl] = useState('');
  const [selectedSObject, setSelectedSObject] = useState(null);
  const [file, setFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [fieldMappings, setFieldMappings] = useState({});
  const [sObjectFields, setSObjectFields] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [failedRecords, setFailedRecords] = useState([]);

  useEffect(() => {
    const url = window.location.href;
    setInstanceUrl(
      url.includes('sandbox')
        ? url.replace(/\.sandbox\..*$/, '.sandbox.my.salesforce.com')
        : url.replace(/\.develop\..*$/, '.develop.my.salesforce.com')
    );

    async function fetchSObjects() {
      try {
        const sObjects = await getAllSobjects(instanceUrl, accessToken);
        if (Array.isArray(sObjects)) {
          setSObjects(sObjects.map(sObject => ({ value: sObject.name, label: sObject.label })));
        } else {
          console.error('sObjects is not an array:', sObjects);
          toast.error('Failed to fetch sObjects');
        }
      } catch (error) {
        console.error('Error fetching sObjects:', error);
        toast.error('Error fetching sObjects');
      }
    }

    if (instanceUrl) {
      fetchSObjects();
    }
  }, [instanceUrl, accessToken]);

  const handleSObjectChange = async (selectedOption) => {
    setSelectedSObject(selectedOption);
    try {
      const fields = await getSObjectFields(instanceUrl, selectedOption.value, accessToken);
      setSObjectFields(fields.map(field => ({ value: field.name, label: field.label })));
    } catch (error) {
      console.error('Error fetching sObject fields:', error.response ? error.response.data : error.message);
      toast.error('Error fetching sObject fields');
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setFile(file);

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        setCsvHeaders(Object.keys(results.data[0]));
        console.log('CSV Data:', results.data); // Log CSV data
      }
    });
  };

  const handleMappingChange = (csvHeader, field) => {
    setFieldMappings({
      ...fieldMappings,
      [csvHeader]: field
    });
    console.log('Field Mappings:', { ...fieldMappings, [csvHeader]: field }); // Log field mappings
  };

  const handleUpload = async () => {
    if (!selectedSObject || !file) return;
  
    const bulkApiUrl = `${instanceUrl}/services/data/v56.0/jobs/ingest`;
  
    try {
      // Step 1: Create a new job
      const jobResponse = await axios.post(bulkApiUrl, {
        object: selectedSObject.value,
        contentType: 'CSV',
        operation: 'insert',
        lineEnding: 'CRLF' // Ensure the line ending is set correctly
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
  
      const jobId = jobResponse.data.id;
  
      // Step 2: Preprocess the CSV file to ensure correct line endings and apply field mappings
      const fileContent = await file.text();
      const parsedData = Papa.parse(fileContent, { header: true }).data;
      const transformedData = parsedData.map(record => {
        const transformedRecord = {};
        for (const [csvHeader, sfField] of Object.entries(fieldMappings)) {
          transformedRecord[sfField] = record[csvHeader];
        }
        return transformedRecord;
      });
      const processedContent = Papa.unparse(transformedData);
      const blob = new Blob([processedContent.replace(/\r?\n/g, '\r\n')], { type: 'text/csv' });
  
      // Step 3: Upload the CSV data
      const uploadUrl = `${bulkApiUrl}/${jobId}/batches`;
      await axios.put(uploadUrl, blob, {
        headers: {
          'Content-Type': 'text/csv',
          'Authorization': `Bearer ${accessToken}`
        }
      });
  
      // Step 4: Close the job
      const closeJobUrl = `${bulkApiUrl}/${jobId}`;
      await axios.patch(closeJobUrl, {
        state: 'UploadComplete'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
  
      // Step 5: Poll job status until it is complete or failed
      const pollJobStatus = async () => {
        const jobStatusUrl = `${bulkApiUrl}/${jobId}`;
        const jobStatusResponse = await axios.get(jobStatusUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
  
        if (jobStatusResponse.data.state === 'JobComplete') {
          console.log('Upload successful');
          toast.success('File uploaded successfully');
          setErrorMessage('');
  
          // Step 6: Retrieve job results
          const jobResultsUrl = `${bulkApiUrl}/${jobId}/successfulResults`;
          const jobResultsResponse = await axios.get(jobResultsUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
  
          console.log('Job results:', jobResultsResponse.data);
  
          // Step 7: Retrieve failed records
          const failedRecordsUrl = `${bulkApiUrl}/${jobId}/failedResults`;
          const failedRecordsResponse = await axios.get(failedRecordsUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
  
          const failedRecordsData = Papa.parse(failedRecordsResponse.data, { header: true }).data;
          setFailedRecords(failedRecordsData);
          console.log('Failed records:', failedRecordsData);
  
          // Check if the upload failed
          if (jobStatusResponse.data.numberRecordsFailed === jobStatusResponse.data.numberRecordsProcessed) {
            console.error('Upload failed: All records failed to process.');
          }
        } else if (jobStatusResponse.data.state === 'Failed') {
          console.error('Job failed:', jobStatusResponse.data);
          setErrorMessage(jobStatusResponse.data.errorMessage || 'Unknown error occurred');
          toast.error('Error uploading file');
  
          // Step 7: Retrieve failed records
          const failedRecordsUrl = `${bulkApiUrl}/${jobId}/failedResults`;
          const failedRecordsResponse = await axios.get(failedRecordsUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
  
          const failedRecordsData = Papa.parse(failedRecordsResponse.data, { header: true }).data;
          setFailedRecords(failedRecordsData);
          console.log('Failed records:', failedRecordsData);
        } else {
          // Poll again after a delay
          setTimeout(pollJobStatus, 5000);
        }
      };
  
      // Start polling
      pollJobStatus();
  
    } catch (error) {
      console.error('Error uploading file:', error.response ? error.response.data : error.message);
      setErrorMessage(error.response ? error.response.data.errorMessage : error.message);
      toast.error('Error uploading file');
    }
  };

  return (
    <div className="upload-container">
        <h2>Upload CSV File</h2>
        <div className="select-container">
            <Select
            options={sObjects}
            onChange={handleSObjectChange}
            placeholder="Select an sObject"
            styles={{
                menu: (provided) => ({
                ...provided,
                maxHeight: '150px',
                overflowY: 'auto',
                }),
            }}
            />
        </div>
        <div className="file-input-container">
            <input type="file" accept=".csv" onChange={handleFileChange} />
        </div>
        {csvHeaders.length > 0 && (
            <div className="mapping-container">
            <h3>Map CSV Columns to Salesforce Fields</h3>
            {csvHeaders.map((header) => (
              <div key={header} className="mapping-row">
                <span>{header}</span>
                <Select
                    options={sObjectFields}
                    onChange={(selectedOption) => handleMappingChange(header, selectedOption.value)}
                    placeholder="Select a field"
                />
              </div>
            ))}
            </div>
        )}
        {failedRecords.length > 0 && (
          <div className="failed-records">
            <h3>Failed Records</h3>
            <pre>{JSON.stringify(failedRecords, null, 2)}</pre>
            <button onClick={() => setFailedRecords([])}>OK</button>
          </div>
        )}
        <button onClick={handleUpload} disabled={!selectedSObject || !file}>
            Upload
        </button>
        <ToastContainer />
    </div>
  );
}