import React, { useEffect, useState } from 'react';
import DataTable from 'react-data-table-component';
import { updateRecordFields } from '../api/updateFields';

export default function SearchBar({ keyFields, accessToken }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [fields, setFields] = useState([]);
  const [initialFields, setInitialFields] = useState([]);
  const [changes, setChanges] = useState({});
  const [objectApiName, setObjectApiName] = useState('');
  const [recordId, setRecordId] = useState('');
  const [instanceUrl, setInstanceUrl] = useState('');
  const [editingRowIndex, setEditingRowIndex] = useState(null);

  useEffect(() => {
    const pathSegments = window.location.pathname.split('/');
    setObjectApiName(pathSegments[pathSegments.length - 3]);
    setRecordId(pathSegments[pathSegments.length - 2]);

    const url = window.location.href;
    setInstanceUrl(
      url.includes('sandbox')
        ? url.replace(/\.sandbox\..*$/, '.sandbox.my.salesforce.com')
        : url.replace(/\.develop\..*$/, '.develop.my.salesforce.com')
    );

    setFields(keyFields);
    setInitialFields(JSON.parse(JSON.stringify(keyFields)));
  }, [keyFields]);

  const filteredFields = fields.filter(
    field => 
      String(field.fieldName).toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(field.fieldValue).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFieldChange = (index, fieldName, value) => {
    const updatedFields = [...fields];
    updatedFields[index].fieldValue = value;
    setFields(updatedFields);

    const updatedChanges = { ...changes, [fieldName]: value };
    setChanges(updatedChanges);
  };

  const updateFieldsInSalesforce = async () => {
    if (!recordId) {
      alert('Record ID is not defined');
      return;
    }

    try {
      const response = await updateRecordFields(instanceUrl, recordId, objectApiName, changes, accessToken);
      if (response.status === 204) {
        alert('Fields updated successfully');
        setChanges({});
        setInitialFields(JSON.parse(JSON.stringify(fields)));
      } else {
        alert('Error updating fields');
      }
    } catch (error) {
      console.error('Error updating fields:', error);
      alert('Error updating fields');
    }
  };

  const isSalesforceId = (value) => {
    const regex = /^[a-zA-Z0-9]{15,18}$/;
    return regex.test(value);
  };

  const hasChanges = () => {
    return Object.keys(changes).length > 0;
  };

  const cancelChanges = () => {
    setFields(JSON.parse(JSON.stringify(initialFields)));
    setChanges({});
  };

  const columns = [
    {
      name: 'Field Name',
      selector: row => row.fieldName,
      sortable: true,
      cell: row => <div title={row.fieldName} className="cell">{row.fieldName}</div>,
      width: '50%',
    },
    {
      name: 'Field Value',
      selector: (row, index) => (
        <div className="cell" title={row.fieldValue} onDoubleClick={() => setEditingRowIndex(index)}>
          {editingRowIndex === index ? (
            <input
              type="text"
              value={row.fieldValue}
              onChange={(e) => handleFieldChange(index, row.fieldName, e.target.value)}
              onBlur={() => setEditingRowIndex(null)}
              autoFocus
              className={changes[row.fieldName] ? 'changed-field' : ''}
            />
          ) : isSalesforceId(row.fieldValue) ? (
            <a href={`/${row.fieldValue}`} target="_blank" rel="noopener noreferrer" title={row.fieldValue}>
              {row.fieldValue}
            </a>
          ) : (
            <span className={changes[row.fieldName] ? 'changed-field' : ''}>{row.fieldValue}</span>
          )}
        </div>
      ),
      sortable: true,
      width: '50%',
    },
  ];

  return (
    <div className="search-container">
      <input
        type="text"
        className="search-input"
        placeholder="Search fields here..."
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div className="datatable-container" id="datatable-container">
        <DataTable
          columns={columns}
          data={filteredFields}
          fixedHeader
          fixedHeaderScrollHeight="300px"
          className="my-table"
        />
      </div>
      {hasChanges() && (
        <div className="button-container">
          <button onClick={cancelChanges} className="cancel-button">Cancel</button>
          <button onClick={updateFieldsInSalesforce} className="save-button">Save</button>
        </div>
      )}
    </div>
  );
}