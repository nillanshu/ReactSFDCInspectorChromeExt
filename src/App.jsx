import React from 'react';
import { useSalesforceSession } from './hooks/useSalesforceSession';
import InspectorModal from './components/InspectorModal';
import './styles/contentStyles.css';

export default function App({ accessToken, userId }) {
  const { keyFields, error} = useSalesforceSession(accessToken);

  // Show the inspector UI even without accessToken for debugging
  // The user can at least see the orange ? mark and try to troubleshoot
  return <InspectorModal keyFields={keyFields} error={error} accessToken={accessToken} userId={userId} />;
}