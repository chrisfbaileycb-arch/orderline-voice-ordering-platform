/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_parseOrder from "../ai/parseOrder.js";
import type * as ai_realtimeToken from "../ai/realtimeToken.js";
import type * as analytics from "../analytics.js";
import type * as automation_orchestrator from "../automation/orchestrator.js";
import type * as automation_testCall from "../automation/testCall.js";
import type * as automation_twilio from "../automation/twilio.js";
import type * as automation_types from "../automation/types.js";
import type * as automation_zoom from "../automation/zoom.js";
import type * as bridge from "../bridge.js";
import type * as callSessions from "../callSessions.js";
import type * as customers from "../customers.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as locations from "../locations.js";
import type * as menu from "../menu.js";
import type * as orders from "../orders.js";
import type * as restaurantConfigs from "../restaurantConfigs.js";
import type * as signups from "../signups.js";
import type * as users from "../users.js";
import type * as voiceSimulator from "../voiceSimulator.js";
import type * as waitlist from "../waitlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/parseOrder": typeof ai_parseOrder;
  "ai/realtimeToken": typeof ai_realtimeToken;
  analytics: typeof analytics;
  "automation/orchestrator": typeof automation_orchestrator;
  "automation/testCall": typeof automation_testCall;
  "automation/twilio": typeof automation_twilio;
  "automation/types": typeof automation_types;
  "automation/zoom": typeof automation_zoom;
  bridge: typeof bridge;
  callSessions: typeof callSessions;
  customers: typeof customers;
  emails: typeof emails;
  http: typeof http;
  locations: typeof locations;
  menu: typeof menu;
  orders: typeof orders;
  restaurantConfigs: typeof restaurantConfigs;
  signups: typeof signups;
  users: typeof users;
  voiceSimulator: typeof voiceSimulator;
  waitlist: typeof waitlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
