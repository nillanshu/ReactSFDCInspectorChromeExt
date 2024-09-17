import React from 'react';
import { useSalesforceSession } from './hooks/useSalesforceSession';
import InspectorModal from './components/InspectorModal';
import './styles/contentStyles.css';

export default function App({ accessToken }) {
  const { keyFields, error, loading } = useSalesforceSession(accessToken);
  console.log('Inside App');
  console.log('Key Fields:', keyFields);
  console.log('Error:', error);

  if (loading) {
    return <div>Loading...</div>;
  }

  return <InspectorModal keyFields={keyFields} error={error} accessToken={accessToken} />;
}