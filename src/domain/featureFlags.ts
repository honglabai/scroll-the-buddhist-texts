export interface FeatureFlags {
  aiStudy: boolean;
  sync: boolean;
  premium: boolean;
  publicComments: boolean;
}

export function getFeatureFlags(): FeatureFlags {
  return {
    aiStudy: process.env.EXPO_PUBLIC_FEATURE_AI_STUDY !== 'false',
    sync: process.env.EXPO_PUBLIC_FEATURE_SYNC === 'true',
    premium: process.env.EXPO_PUBLIC_FEATURE_PREMIUM === 'true',
    publicComments: process.env.EXPO_PUBLIC_FEATURE_PUBLIC_COMMENTS === 'true',
  };
}
