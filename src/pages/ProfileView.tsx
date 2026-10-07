import React from 'react';
import { SettingsView } from './SettingsView';

export const ProfileView: React.FC<{
  onNavigate?: (nav: string) => void;
  initialTab?: any;
}> = (props) => {
  return <SettingsView {...props} />;
};
