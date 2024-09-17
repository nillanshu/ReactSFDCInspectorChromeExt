import React, { useEffect, useState } from 'react';
import SearchBar from './SearchBar';

export default function InspectorModal({ keyFields, error, accessToken }) {
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    console.log('Inside Inspector Modal');
    console.log('Key Fields:', keyFields);
    console.log('Error:', error);
    console.log('Modal Visible:', modalVisible);
  }, [keyFields, error, modalVisible]);

  if (!keyFields || keyFields.length === 0) {
    console.log('No key fields available');
    return null;
  }

  return (
    <div>
      <div id="help-container" onClick={() => setModalVisible(!modalVisible)}>
        <div className="help-content">
            <div>Need Help</div>
            <div className="help-question-mark">?</div>
        </div>
    </div>
      {modalVisible && (
        <div id="modal" className="fixed-left">
          <div className="fixed-left-content">
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <SearchBar keyFields={keyFields} accessToken={accessToken} />
          </div>
        </div>
      )}
    </div>
  );
}