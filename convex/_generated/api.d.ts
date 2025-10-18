/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_bestBuyScraper from "../actions/bestBuyScraper.js";
import type * as actions_brightdata from "../actions/brightdata.js";
import type * as actions_playwrightScraper from "../actions/playwrightScraper.js";
import type * as actions_searchProducts from "../actions/searchProducts.js";
import type * as http from "../http.js";
import type * as interactionSignals from "../interactionSignals.js";
import type * as mutations_brightdata from "../mutations/brightdata.js";
import type * as myFunctions from "../myFunctions.js";
import type * as personalizedSearch from "../personalizedSearch.js";
import type * as preferenceItemsManagement from "../preferenceItemsManagement.js";
import type * as preferenceLearning from "../preferenceLearning.js";
import type * as preferenceUsers from "../preferenceUsers.js";
import type * as products from "../products.js";
import type * as queries from "../queries.js";
import type * as research from "../research.js";
import type * as todos from "../todos.js";
import type * as userPreferences from "../userPreferences.js";
import type * as voiceShopper from "../voiceShopper.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "actions/bestBuyScraper": typeof actions_bestBuyScraper;
  "actions/brightdata": typeof actions_brightdata;
  "actions/playwrightScraper": typeof actions_playwrightScraper;
  "actions/searchProducts": typeof actions_searchProducts;
  http: typeof http;
  interactionSignals: typeof interactionSignals;
  "mutations/brightdata": typeof mutations_brightdata;
  myFunctions: typeof myFunctions;
  personalizedSearch: typeof personalizedSearch;
  preferenceItemsManagement: typeof preferenceItemsManagement;
  preferenceLearning: typeof preferenceLearning;
  preferenceUsers: typeof preferenceUsers;
  products: typeof products;
  queries: typeof queries;
  research: typeof research;
  todos: typeof todos;
  userPreferences: typeof userPreferences;
  voiceShopper: typeof voiceShopper;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
