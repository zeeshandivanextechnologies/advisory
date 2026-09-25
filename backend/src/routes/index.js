const { Router } = require('express');
const multer = require('multer');
const env = require('../config/env');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler: h } = require('../utils/http');

const auth = require('../controllers/auth.controller');
const users = require('../controllers/users.controller');
const advisors = require('../controllers/advisors.controller');
const cases = require('../controllers/cases.controller');
const documents = require('../controllers/documents.controller');
const admin = require('../controllers/admin.controller');
const misc = require('../controllers/misc.controller');
const services = require('../controllers/services.controller');
const journey = require('../controllers/journey.controller');
const team = require('../controllers/team.controller');
const aiDrafts = require('../controllers/ai.controller');
const deliverables = require('../controllers/deliverables.controller');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.maxUploadBytes } });
const router = Router();

/* ── Public ─────────────────────────────────────────────── */
router.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));
router.get('/settings', h(misc.publicSettings));
router.post('/contact', h(misc.contact));
router.post('/payments/stripe/webhook', h(misc.stripeWebhook)); // raw body, see app.js
router.get('/subscriptions/plans', h(misc.plans));
router.get('/services/catalog', h(services.catalog));

/* ── Auth ───────────────────────────────────────────────── */
router.post('/auth/login', h(auth.login));
router.post('/auth/register', h(auth.register));
router.post('/auth/verify-otp', h(auth.verifyOtp));
router.post('/auth/resend-otp', h(auth.resendOtp));
router.post('/auth/forgot-password', h(auth.forgotPassword));
router.post('/auth/reset-password', h(auth.resetPassword));
router.get('/auth/me', requireAuth, h(auth.me));
router.put('/auth/change-password', requireAuth, h(auth.changePassword));

// Everything below needs a logged-in user
router.use(requireAuth);

/* ── Users (clients) ────────────────────────────────────── */
router.get('/users/dashboard', h(users.dashboard));
router.get('/users/profile', h(users.getProfile));
router.put('/users/profile', h(users.updateProfile));
router.get('/users/notification-prefs', h(misc.getNotificationPrefs));
router.put('/users/notification-prefs', h(misc.updateNotificationPrefs));
router.get('/users/consultations', h(users.listConsultations));
router.post('/users/consultations', h(users.bookConsultation));
router.put('/users/consultations/:id', h(users.updateConsultation));
router.get('/users/consultations/:id/join', h(users.joinConsultation));

/* ── Advisors ───────────────────────────────────────────── */
router.get('/advisors', h(advisors.list));
router.get('/advisors/dashboard', h(advisors.dashboard));
router.get('/advisors/profile', h(advisors.getProfile));
router.put('/advisors/profile', h(advisors.updateProfile));

/* ── Cases + workspace ──────────────────────────────────── */
router.get('/cases', h(cases.list));
router.post('/cases', h(cases.create));
router.get('/cases/:id', h(cases.detail));
router.put('/cases/:id', h(cases.update));
router.post('/cases/:id/milestones', h(cases.createMilestone));
router.put('/cases/:id/milestones/:itemId', h(cases.updateMilestone));
router.delete('/milestones/:itemId', h(cases.deleteMilestone));
router.post('/cases/:id/checklist', h(cases.createChecklistItem));
router.put('/cases/:id/checklist/:itemId', h(cases.updateChecklistItem));
router.delete('/checklist/:itemId', h(cases.deleteChecklistItem));
router.post('/cases/:id/updates', h(cases.addUpdate));

/* ── Documents ──────────────────────────────────────────── */
router.get('/documents', h(documents.list));
router.post('/documents', upload.single('file'), h(documents.upload));
router.get('/documents/:id/download', h(documents.download));
router.put('/documents/:id/review', h(documents.review));
router.delete('/documents/:id', h(documents.remove));

/* ── Notifications ──────────────────────────────────────── */
router.get('/notifications', h(misc.listNotifications));
router.post('/notifications/read', h(misc.markNotificationsRead));

/* ── Intake ─────────────────────────────────────────────── */
router.get('/intake', h(misc.getMyIntake));
router.put('/intake', h(misc.saveIntake));
router.get('/intake/:userId', h(misc.getUserIntake));

/* ── Subscriptions & payments ───────────────────────────── */
router.get('/subscriptions/my-subscription', h(misc.mySubscription));
router.post('/subscriptions/purchase', h(misc.purchase));
router.get('/subscriptions/admin/plans', h(misc.adminPlans));
router.post('/subscriptions/admin/plans', h(misc.adminCreatePlan));
router.put('/subscriptions/admin/plans/:id', h(misc.adminUpdatePlan));
router.delete('/subscriptions/admin/plans/:id', h(misc.adminDeletePlan));
router.get('/payments', h(misc.payments));
router.get('/payments/stripe/confirm', h(misc.confirmCheckout));

/* ── Services, retainers, community ─────────────────────── */
router.post('/services/requests', h(services.requestService));
router.get('/services/requests', h(services.myRequests));
router.put('/services/requests/:id/cancel', h(services.cancelRequest));
router.get('/sales/status', h(services.mySalesStatus));
router.get('/retainers', h(services.retainers));
router.get('/retainers/:id', h(services.retainerDetail));
router.post('/retainers/:id/logs', h(services.logHours));
router.delete('/retainer-logs/:logId', h(services.deleteLog));
router.get('/community/memberships', h(services.myMemberships));
router.put('/community/memberships/:id/respond', h(services.respondMembership));
router.get('/community/events', h(services.events));
router.put('/community/events/:id/rsvp', h(services.rsvp));
router.get('/community/briefs', h(services.briefs));

/* ── Client journey: proposals, engagements, invoices ────── */
router.get('/proposals', h(journey.myProposals));
router.put('/proposals/:id/respond', h(journey.respondProposal));
router.get('/engagements', h(journey.engagements));
router.get('/engagements/:id', h(journey.engagementDetail));
router.put('/engagements/:id', h(journey.updateEngagement));
router.post('/engagements/:id/qa', h(journey.addQaItem));
router.put('/engagement-qa/:itemId', h(journey.setQaItem));
router.post('/engagement-invoices/:id/pay', h(journey.payInvoiceOnline));
router.get('/engagements/:id/deliverables', h(deliverables.list));
router.post('/engagements/:id/deliverables', upload.single('file'), h(deliverables.create));
router.put('/deliverables/:id', h(deliverables.update));
router.post('/deliverables/:id/action', h(deliverables.action));
router.put('/deliverable-qa/:itemId', h(deliverables.setQa));
router.get('/deliverables/:id/download', h(deliverables.download));

/* ── Staffing & AI drafts ────────────────────────────────── */
router.get('/team/me', h(team.myScope));
router.get('/engagements/:id/team', h(team.engagementTeam));
router.post('/ai/proposal-draft', h(aiDrafts.proposalDraft));
router.post('/ai/lead-reply', h(aiDrafts.leadReply));
router.post('/ai/brief-draft', h(aiDrafts.briefDraft));
router.post('/ai/financial-model', h(aiDrafts.financialModel));
router.post('/ai/checklist', h(aiDrafts.checklist));

/* ── Admin ──────────────────────────────────────────────── */
router.get('/admin/dashboard', h(admin.dashboard));
router.get('/admin/users', h(admin.users));
router.put('/admin/users/:id/toggle', h(admin.toggleUser));
router.get('/admin/advisors', h(admin.advisors));
router.put('/admin/advisors/:id/status', h(admin.updateAdvisorStatus));
router.get('/admin/revenue', h(admin.revenue));
router.get('/admin/settings', h(admin.getSettings));
router.put('/admin/settings', h(admin.updateSettings));
router.get('/admin/leads', h(admin.leads));
router.put('/admin/leads/:id', h(admin.updateLead));
router.get('/admin/services/offerings', h(services.adminOfferings));
router.post('/admin/services/offerings', h(services.adminCreateOffering));
router.put('/admin/services/offerings/:id', h(services.adminUpdateOffering));
router.get('/admin/services/requests', h(services.adminRequests));
router.put('/admin/services/requests/:id', h(services.adminUpdateRequest));
router.post('/admin/services/requests/:id/action', h(services.adminRequestAction));
router.get('/admin/sales/:userId', h(services.adminSalesProfile));
router.put('/admin/sales/:userId', h(services.adminSetProspect));
router.post('/admin/retainers', h(services.adminCreateRetainer));
router.put('/admin/retainers/:id', h(services.adminUpdateRetainer));
router.get('/admin/community/memberships', h(services.adminMemberships));
router.post('/admin/community/memberships', h(services.adminCreateMembership));
router.put('/admin/community/memberships/:id', h(services.adminUpdateMembership));
router.get('/admin/community/events', h(services.adminEvents));
router.post('/admin/community/events', h(services.adminCreateEvent));
router.put('/admin/community/events/:id', h(services.adminUpdateEvent));
router.delete('/admin/community/events/:id', h(services.adminDeleteEvent));
router.post('/admin/community/briefs', h(services.adminCreateBrief));
router.put('/admin/community/briefs/:id', h(services.adminUpdateBrief));
router.delete('/admin/community/briefs/:id', h(services.adminDeleteBrief));
router.get('/admin/proposals', h(journey.adminProposals));
router.post('/admin/proposals', h(journey.adminCreateProposal));
router.put('/admin/proposals/:id', h(journey.adminUpdateProposal));
router.post('/admin/proposals/:id/send', h(journey.adminSendProposal));
router.post('/admin/proposals/:id/withdraw', h(journey.adminWithdrawProposal));
router.get('/admin/engagement-invoices', h(journey.adminInvoices));
router.post('/admin/engagement-invoices/:id/payment', h(journey.adminRecordPayment));
router.get('/admin/followups', h(journey.adminFollowups));
router.put('/admin/followups/:id', h(journey.adminUpdateFollowup));
router.get('/admin/team/staff', h(team.staff));
router.post('/admin/team/staff', h(team.createStaff));
router.put('/admin/team/staff/:id', h(team.updateStaff));
router.get('/admin/team/logins', h(team.logins));
router.post('/admin/team/logins', h(team.grantLogin));
router.delete('/admin/team/logins/:userId', h(team.revokeLogin));
router.put('/admin/engagements/:id/team', h(team.saveTeamMember));
router.delete('/admin/engagement-team/:assignmentId', h(team.removeTeamMember));

module.exports = router;
