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

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.maxUploadBytes } });
const router = Router();

/* ── Public ─────────────────────────────────────────────── */
router.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));
router.get('/settings', h(misc.publicSettings));
router.post('/contact', h(misc.contact));
router.get('/subscriptions/plans', h(misc.plans));

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

module.exports = router;
