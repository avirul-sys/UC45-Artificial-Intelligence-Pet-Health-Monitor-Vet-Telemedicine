import React, { useState, useEffect, useCallback } from 'react';
import {
  AppBar, Toolbar, Typography, Box, Card, CardContent, Button, TextField,
  Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Select, MenuItem, FormControl, InputLabel, CircularProgress,
  Snackbar, Alert, LinearProgress,
} from '@mui/material';
import axios from 'axios';

const BASE = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1`;
const PAGE_SIZE = 20;

const URGENCY_COLORS = {
  EMERGENCY: '#DC2626',
  URGENT: '#D97706',
  MONITOR: '#2563EB',
  SAFE: '#16A34A',
  UNDETERMINED: '#6B7280',
};

const URGENCY_BG = {
  EMERGENCY: '#FEF2F2',
  URGENT: '#FFFBEB',
  MONITOR: '#EFF6FF',
  SAFE: '#F0FDF4',
  UNDETERMINED: '#F9FAFB',
};

const CONFIG_META = {
  confidence_threshold: {
    label: 'Confidence threshold',
    description: 'Min confidence score (0.0–1.0) required for a definitive result. Below this triggers fallback.',
    type: 'number', min: 0.3, max: 0.9, step: 0.05,
  },
  rate_limit_per_hour: {
    label: 'Rate limit (requests / hour)',
    description: 'Max triage requests a single user can submit per hour.',
    type: 'number', min: 1, max: 100, step: 1,
  },
  gpt4o_timeout_seconds: {
    label: 'GPT-4o timeout (seconds)',
    description: 'Per-module HTTP timeout when calling OpenAI. Shorter = faster fallback; longer = more reliable.',
    type: 'number', min: 1, max: 30, step: 0.5,
  },
  circuit_breaker_reset_seconds: {
    label: 'Circuit breaker reset (seconds)',
    description: 'Seconds an open circuit waits before probing with a half-open request.',
    type: 'number', min: 10, max: 300, step: 10,
  },
  prompt_version_id: {
    label: 'Prompt version ID',
    description: 'Active prompt template version sent to AI modules. Recorded in every audit log entry.',
    type: 'text',
  },
};

const ALL_TIERS = ['EMERGENCY', 'URGENT', 'MONITOR', 'SAFE', 'UNDETERMINED'];

function apiClient(token) {
  return axios.create({
    baseURL: BASE,
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Email and password are required.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${BASE}/auth/login`, { email, password });
      onLogin(res.data.access_token, res.data.user);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Login failed. Check credentials or admin access.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F3F4F6' }}>
      <Card sx={{ width: 420, p: 1 }}>
        <CardContent>
          <Typography variant="h5" fontWeight={700} mb={0.5}>AI Pet Health Admin</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Sign in with an admin account to continue.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField label="Email address" type="email" fullWidth size="small"
              value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }} />
            <TextField label="Password" type="password" fullWidth size="small"
              value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mb: 3 }} />
            <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ py: 1.5 }}>
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color }) {
  return (
    <Card sx={{ flex: 1, minWidth: 170 }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>{label}</Typography>
        <Typography variant="h4" fontWeight={700} sx={{ color }}>{value ?? '—'}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

function BarRow({ label, value, color }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
      <Typography variant="body2" sx={{ width: 160, flexShrink: 0 }}>{label}</Typography>
      <Box sx={{ flex: 1 }}>
        <LinearProgress variant="determinate" value={value}
          sx={{ height: 10, borderRadius: 5, bgcolor: '#E5E7EB',
            '& .MuiLinearProgress-bar': { bgcolor: color } }}
        />
      </Box>
      <Typography variant="body2" fontWeight={600} sx={{ width: 44, textAlign: 'right' }}>{value}%</Typography>
    </Box>
  );
}

function DashboardTab({ token }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient(token).get('/admin/metrics');
      setMetrics(res.data);
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  const confPct = metrics ? Math.round((metrics.avg_confidence || 0) * 100) : 0;
  const fallPct = metrics ? parseFloat(((metrics.fallback_rate || 0) * 100).toFixed(1)) : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={600}>Today's overview</Typography>
        <Button variant="outlined" size="small" onClick={refresh} disabled={loading}>Refresh</Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <MetricCard
          label="Triage requests today"
          value={metrics?.triage_requests_today}
          color="#2563EB"
        />
        <MetricCard
          label="Avg confidence score"
          value={metrics ? `${confPct}%` : '—'}
          sub="Across all AI modules"
          color={confPct >= 70 ? '#16A34A' : confPct >= 50 ? '#D97706' : '#DC2626'}
        />
        <MetricCard
          label="Fallback rate"
          value={metrics ? `${fallPct}%` : '—'}
          sub="Low-confidence results"
          color={fallPct < 10 ? '#16A34A' : fallPct < 25 ? '#D97706' : '#DC2626'}
        />
        <MetricCard
          label="Active vet sessions"
          value={metrics?.active_sessions}
          color="#7C3AED"
        />
      </Box>

      <Typography variant="subtitle1" fontWeight={600} mb={1.5}>Health indicators</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <BarRow
          label="Avg confidence"
          value={confPct}
          color={confPct >= 70 ? '#16A34A' : confPct >= 50 ? '#D97706' : '#DC2626'}
        />
        <BarRow
          label="Fallback rate"
          value={fallPct}
          color={fallPct < 10 ? '#16A34A' : fallPct < 25 ? '#D97706' : '#DC2626'}
        />
      </Paper>
    </Box>
  );
}

// ─── Configuration ────────────────────────────────────────────────────────────
function ConfigTab({ token }) {
  const [configs, setConfigs] = useState({});
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

  useEffect(() => {
    apiClient(token).get('/admin/config')
      .then((res) => {
        setConfigs(res.data);
        setEdits(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const save = async (key) => {
    setSaving(key);
    try {
      await apiClient(token).put('/admin/config', { key, value: String(edits[key]) });
      setConfigs((c) => ({ ...c, [key]: edits[key] }));
      setSnack({ open: true, msg: `"${CONFIG_META[key]?.label || key}" saved.`, sev: 'success' });
    } catch (err) {
      const detail = err.response?.data?.detail;
      setSnack({ open: true, msg: typeof detail === 'string' ? detail : 'Save failed.', sev: 'error' });
    }
    setSaving('');
  };

  const isDirty = (key) => String(edits[key] ?? '') !== String(configs[key] ?? '');

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={0.5}>Runtime configuration</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Changes apply immediately — no server restart required.
      </Typography>

      {loading ? <LinearProgress /> : (
        Object.entries(CONFIG_META).map(([key, meta]) => (
          <Paper key={key} variant="outlined" sx={{ p: 2.5, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 240 }}>
                <Typography fontWeight={600} mb={0.5}>{meta.label}</Typography>
                <Typography variant="body2" color="text.secondary">{meta.description}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                <TextField
                  size="small"
                  type={meta.type}
                  value={edits[key] ?? configs[key] ?? ''}
                  onChange={(e) => setEdits((v) => ({ ...v, [key]: e.target.value }))}
                  inputProps={meta.type === 'number'
                    ? { min: meta.min, max: meta.max, step: meta.step }
                    : {}}
                  sx={{ width: meta.type === 'number' ? 130 : 180 }}
                />
                <Button
                  variant="contained"
                  size="small"
                  disabled={saving === key || !isDirty(key)}
                  onClick={() => save(key)}
                  sx={{ minWidth: 64, height: 36 }}
                >
                  {saving === key ? <CircularProgress size={16} color="inherit" /> : 'Save'}
                </Button>
              </Box>
            </Box>
          </Paper>
        ))
      )}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
function AuditLogTab({ token }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [tiers, setTiers] = useState([]);
  const [fallbackFilter, setFallbackFilter] = useState('all');
  const [minConf, setMinConf] = useState('0');
  const [maxConf, setMaxConf] = useState('1');

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    if (fromDate) p.append('from_date', fromDate);
    if (toDate) p.append('to_date', toDate);
    tiers.forEach((t) => p.append('urgency_tier', t));
    if (fallbackFilter === 'yes') p.append('fallback', 'true');
    if (fallbackFilter === 'no') p.append('fallback', 'false');
    if (minConf) p.append('min_confidence', minConf);
    if (maxConf) p.append('max_confidence', maxConf);
    return p;
  }, [fromDate, toDate, tiers, fallbackFilter, minConf, maxConf]);

  const fetchPage = useCallback(async (pg) => {
    setLoading(true);
    try {
      const params = buildParams();
      params.append('page', pg);
      const res = await apiClient(token).get(`/admin/audit-log?${params}`);
      setItems(res.data.items);
      setTotal(res.data.total);
      setPage(pg);
    } catch {}
    setLoading(false);
  }, [token, buildParams]);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = buildParams();
      const res = await apiClient(token).get(`/admin/audit-log/export?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setExporting(false);
  };

  const clearFilters = () => {
    setFromDate(''); setToDate(''); setTiers([]);
    setFallbackFilter('all'); setMinConf('0'); setMaxConf('1');
  };

  const toggleTier = (t) =>
    setTiers((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <Box>
      {/* Filter panel */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} mb={2}>Filters</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end', mb: 2 }}>
          <TextField label="From date" type="date" size="small" value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
          <TextField label="To date" type="date" size="small" value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
          <FormControl size="small" sx={{ width: 130 }}>
            <InputLabel>Fallback</InputLabel>
            <Select value={fallbackFilter} label="Fallback" onChange={(e) => setFallbackFilter(e.target.value)}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Min confidence" type="number" size="small" value={minConf}
            onChange={(e) => setMinConf(e.target.value)}
            inputProps={{ min: 0, max: 1, step: 0.05 }} sx={{ width: 145 }} />
          <TextField label="Max confidence" type="number" size="small" value={maxConf}
            onChange={(e) => setMaxConf(e.target.value)}
            inputProps={{ min: 0, max: 1, step: 0.05 }} sx={{ width: 145 }} />
          <Button variant="contained" size="small" onClick={() => fetchPage(1)}>Apply</Button>
          <Button variant="outlined" size="small" onClick={clearFilters}>Clear</Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary">Urgency tier:</Typography>
          {ALL_TIERS.map((t) => (
            <Chip
              key={t}
              label={t}
              size="small"
              clickable
              onClick={() => toggleTier(t)}
              sx={{
                bgcolor: tiers.includes(t) ? URGENCY_COLORS[t] : 'transparent',
                color: tiers.includes(t) ? '#fff' : URGENCY_COLORS[t],
                border: `1.5px solid ${URGENCY_COLORS[t]}`,
                fontWeight: 600,
              }}
            />
          ))}
        </Box>
      </Paper>

      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          {total} record{total !== 1 ? 's' : ''}{total > 0 ? ` · page ${page} of ${totalPages}` : ''}
        </Typography>
        <Button variant="outlined" size="small" disabled={exporting || total === 0} onClick={handleExport}>
          {exporting && <CircularProgress size={14} sx={{ mr: 1 }} />}
          Export CSV
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {/* Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F9FAFB' }}>
              <TableCell sx={{ fontWeight: 700 }}>Triage ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Urgency</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Confidence</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Fallback</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Model</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Prompt</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                  No records match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => {
                const confPct = Math.round((row.confidence_score || 0) * 100);
                const confColor = confPct >= 70 ? '#16A34A' : confPct >= 50 ? '#D97706' : '#DC2626';
                return (
                  <TableRow key={row.triage_id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, color: '#6B7280' }}>
                      {(row.triage_id || '').slice(0, 8)}…
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.urgency_tier || '—'}
                        size="small"
                        sx={{
                          bgcolor: URGENCY_BG[row.urgency_tier] || '#F9FAFB',
                          color: URGENCY_COLORS[row.urgency_tier] || '#6B7280',
                          border: `1px solid ${URGENCY_COLORS[row.urgency_tier] || '#E5E7EB'}`,
                          fontWeight: 600,
                          fontSize: 11,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={confPct}
                          sx={{
                            width: 60, height: 6, borderRadius: 3, bgcolor: '#E5E7EB',
                            '& .MuiLinearProgress-bar': { bgcolor: confColor },
                          }}
                        />
                        <Typography variant="caption" sx={{ color: confColor, fontWeight: 600 }}>
                          {confPct}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {row.fallback_triggered
                        ? <Chip label="Yes" size="small" sx={{ bgcolor: '#FEF2F2', color: '#DC2626', border: '1px solid #DC2626', fontSize: 11 }} />
                        : <Chip label="No" size="small" sx={{ bgcolor: '#F0FDF4', color: '#16A34A', border: '1px solid #16A34A', fontSize: 11 }} />}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{row.model_version}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{row.prompt_version_id}</TableCell>
                    <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(row.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.5, mt: 2 }}>
          <Button size="small" variant="outlined" disabled={page <= 1} onClick={() => fetchPage(page - 1)}>
            Previous
          </Button>
          <Typography variant="body2">Page {page} / {totalPages}</Typography>
          <Button size="small" variant="outlined" disabled={page >= totalPages} onClick={() => fetchPage(page + 1)}>
            Next
          </Button>
        </Box>
      )}
    </Box>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('uc45_admin_token') || null);
  const [adminUser, setAdminUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('uc45_admin_user')); } catch { return null; }
  });
  const [tab, setTab] = useState(0);

  const handleLogin = (accessToken, user) => {
    localStorage.setItem('uc45_admin_token', accessToken);
    localStorage.setItem('uc45_admin_user', JSON.stringify(user));
    setToken(accessToken);
    setAdminUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('uc45_admin_token');
    localStorage.removeItem('uc45_admin_user');
    setToken(null);
    setAdminUser(null);
  };

  if (!token) return <LoginScreen onLogin={handleLogin} />;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F3F4F6' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: '#1E293B' }}>
        <Toolbar>
          <Typography variant="h6" fontWeight={700} sx={{ flex: 1, letterSpacing: '-0.3px' }}>
            AI Pet Health Admin
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)', mr: 2 }}>
            {adminUser?.name || adminUser?.email || 'Admin'}
          </Typography>
          <Button size="small" onClick={handleLogout}
            sx={{ color: 'rgba(255,255,255,0.75)', '&:hover': { color: '#fff' } }}>
            Sign out
          </Button>
        </Toolbar>

        <Box sx={{ bgcolor: '#1E293B', px: 2 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            TabIndicatorProps={{ style: { backgroundColor: '#60A5FA', height: 3 } }}
            sx={{
              '& .MuiTab-root': { color: 'rgba(255,255,255,0.55)', textTransform: 'none', fontWeight: 500 },
              '& .Mui-selected': { color: '#fff !important' },
            }}
          >
            <Tab label="Dashboard" />
            <Tab label="Configuration" />
            <Tab label="Audit log" />
          </Tabs>
        </Box>
      </AppBar>

      <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, sm: 4 } }}>
        {tab === 0 && <DashboardTab token={token} />}
        {tab === 1 && <ConfigTab token={token} />}
        {tab === 2 && <AuditLogTab token={token} />}
      </Box>
    </Box>
  );
}
