import * as supabaseApi from './api.supabase';
import * as restApi from './api.rest';

/*
 * Picks the backend at build time via REACT_APP_BACKEND in .env:
 *   supabase (default) → serverless, talks to Supabase directly   (api.supabase.js)
 *   express            → the Node/Express server in backend/        (api.rest.js)
 * Both expose the same functions and response shapes.
 */
export const BACKEND = process.env.REACT_APP_BACKEND === 'express' ? 'express' : 'supabase';

const impl = BACKEND === 'express' ? restApi : supabaseApi;

export const authAPI          = impl.authAPI;
export const userAPI          = impl.userAPI;
export const advisorAPI       = impl.advisorAPI;
export const caseAPI          = impl.caseAPI;
export const documentAPI      = impl.documentAPI;
export const caseWorkspaceAPI = impl.caseWorkspaceAPI;
export const intakeAPI        = impl.intakeAPI;
export const notifAPI         = impl.notifAPI;
export const adminAPI         = impl.adminAPI;
export const subscriptionAPI  = impl.subscriptionAPI;
export const paymentAPI       = impl.paymentAPI;
export const publicAPI        = impl.publicAPI;
export const serviceAPI       = impl.serviceAPI;
export const communityAPI     = impl.communityAPI;
export const journeyAPI       = impl.journeyAPI;
export const salesAPI         = impl.salesAPI;
export const teamAPI          = impl.teamAPI;
export const aiAPI            = impl.aiAPI;
export const deliverableAPI   = impl.deliverableAPI;
