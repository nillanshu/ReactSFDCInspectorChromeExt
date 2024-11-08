import React from 'react';
import { useSalesforceSession } from './hooks/useSalesforceSession';
import InspectorModal from './components/InspectorModal';
import './styles/contentStyles.css';

export default function App({ accessToken, userId }) {
  const { keyFields, error} = useSalesforceSession(accessToken);

  if(accessToken && (keyFields || error)) {
    return <InspectorModal keyFields={keyFields} error={error} accessToken={accessToken} userId={userId} />;
  }

  return null;
}