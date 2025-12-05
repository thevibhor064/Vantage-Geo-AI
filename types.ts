
export interface LocationData {
  name: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  summary?: string;
  mapLink?: string;
  source?: string;
}

export enum AppSection {
  SEARCH = 'SEARCH',
  PLANNER = 'PLANNER',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
  sources?: Array<{
    title: string;
    uri: string;
  }>;
}

export interface HiddenGem {
  name: string;
  description: string;
  location_hint: string;
  imageUrl?: string; // Generated on the fly
}

export interface TravelPlan {
  confidence: string;
  overview: string;
  disaster_profile: {
    zone_type: string;
    risk_score: string;
    details: string;
  };
  safety_measures: string[];
  itinerary: string[];
  weather: {
    crowd_levels: string;
    crowd_curve: Array<{ month: string; score: number }>; // 0-100 score
    best_time_to_visit: string;
    forecast_summary: string;
  };
  photography: {
    basic_guide: string;
    technical_settings: {
      iso: string;
      shutter_speed: string;
      aperture: string;
      notes: string;
    };
  };
  trip_guide: {
    transport_system: string;
    travel_tips: string[];
    packing_suggestions: string[];
    common_scams: string;
  };
}

export interface VideoGenerationState {
  status: 'idle' | 'generating' | 'completed' | 'error';
  videoUri?: string;
  error?: string;
}
