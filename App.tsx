
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { LocationSearch } from './components/LocationSearch';
import { TravelAgent } from './components/TravelAgent';
import { AppSection, LocationData } from './types';

export default function App() {
  const [section, setSection] = useState<AppSection>(AppSection.SEARCH);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);

  const handleLocationFound = (loc: LocationData) => {
    setCurrentLocation(loc);
    // Optionally stay on search to show result, user can manually nav to others
  };

  const handleNavigate = (newSection: AppSection) => {
    setSection(newSection);
  };

  const renderContent = () => {
    switch (section) {
      case AppSection.SEARCH:
        return <LocationSearch onLocationFound={handleLocationFound} />;
      case AppSection.PLANNER:
        return <TravelAgent initialLocation={currentLocation?.name} />;
      default:
        return <LocationSearch onLocationFound={handleLocationFound} />;
    }
  };

  return (
    <Layout currentSection={section} onNavigate={handleNavigate}>
      {renderContent()}
    </Layout>
  );
}
