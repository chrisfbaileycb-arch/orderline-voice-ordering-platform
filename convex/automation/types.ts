// Shared types for the OrderLine onboarding automation scaffold.
// Each step receives a SignupContext and returns a StepResult.

export type SignupContext = {
  signupId: string;
  contactName: string;
  restaurantName: string;
  email: string;
  restaurantPhone: string; // the phone line OrderLine will answer
  posSystem: string;
  locationCount: string;
  voicePreference: string;
  zoomDate?: string;
  linkedLocationId?: string;
};

export type StepResult =
  | { ok: true; detail?: string }
  | { ok: false; error: string };
