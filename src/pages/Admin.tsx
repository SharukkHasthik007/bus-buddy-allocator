import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

type OverviewRow = {
  number: number;
  busNumber: string;
  driver: string;
  capacity: number;
  studentsTotal: number;
  boys: number;
  girls: number;
  staff: number;
};

export default function Admin() {
  const navigate = useNavigate();
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const realTableRef = useRef<HTMLTableElement | null>(null);
  const fixedTableRef = useRef<HTMLTableElement | null>(null);
  const [rows, setRows] = useState<OverviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ number: number; loading: boolean; error?: string; route?: any } | null>(null);

  // Poll attendance for the selected route so admins see coordinator submissions in near real-time
  useEffect(() => {
    if (!selected || !selected.number) return;
    let mounted = true;
    let timer: any = null;

    const fetchAttendance = async () => {
      try {
        const resp = await fetch(`/routes/${selected.number}/attendance`);
        if (!mounted) return;
        if (!resp.ok) return; // ignore errors during polling
        const ct = resp.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return;
        const json = await resp.json();
        if (json && json.success) {
          setSelected((prev) => (prev && prev.number === selected.number ? { ...prev, route: { ...(prev.route || {}), attendance: json.attendance || [] } } : prev));
        }
      } catch (e) {
        // swallow polling errors silently
      }
    };

    // initial fetch and then poll every 8s
    fetchAttendance();
    timer = setInterval(fetchAttendance, 8000);

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [selected]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const resp = await fetch('/routes/admin/overview');
        if (!mounted) return;
        if (!resp.ok) {
          const txt = await resp.text();
          setError(txt || `Failed to load overview (${resp.status})`);
          return;
        }
        const contentType = resp.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const txt = await resp.text();
          setError(txt || 'Server returned non-JSON for overview');
          return;
        }
        const json = await resp.json();
        if (json && json.success) {
          // sort overview rows by route number so the admin table is stable and predictable
          const overview = json.overview || [];
          overview.sort((a: OverviewRow, b: OverviewRow) => (a.number || 0) - (b.number || 0));
          setRows(overview);
          // trigger a resize event shortly after rows load so the fixed header sync runs
          setTimeout(() => window.dispatchEvent(new Event('resize')), 120);
        }
        else setError(json?.message || 'Failed to load overview');
      } catch (e: any) {
        setError(e?.message || 'Network error');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // NOTE: previously we toggled a cloned header on scroll. Sticky headers were unreliable
  // across browsers/stacking contexts, so we render a fixed header at the top and add
  // padding to the scroll container so table rows don't hide underneath it.
  useEffect(() => {
    const sync = () => {
      const real = realTableRef.current;
      const fixed = fixedTableRef.current;
      const container = tableScrollRef.current;
      const fixedContainer = document.getElementById('fixed-header');
      if (!real || !fixed || !container || !fixedContainer) return;

  const rt = real.getBoundingClientRect();
  // position fixed header to align with table (keep the original fixed-top behavior)
    // position fixed header to align with table (keep the original fixed-top behavior)
    fixedContainer.style.top = `0px`;
  fixedContainer.style.left = `${rt.left}px`;
  fixedContainer.style.width = `${rt.width}px`;

      // Prefer measuring the first body row cells (TD) for column widths — more representative
      const firstRow = real.querySelector('tbody tr') as HTMLTableRowElement | null;
      let measuredWidths: number[] = [];
      let measuredPaddings: { left: string; right: string }[] = [];

      if (firstRow) {
        const tds = Array.from(firstRow.querySelectorAll('td')) as HTMLElement[];
        if (tds.length) {
          measuredWidths = tds.map((td) => td.getBoundingClientRect().width);
          measuredPaddings = tds.map((td) => {
            try {
              const cs = window.getComputedStyle(td);
              return { left: cs.paddingLeft, right: cs.paddingRight };
            } catch (e) {
              return { left: '0px', right: '0px' };
            }
          });
        }
      }

      // fallback to header TH widths if no body row exists yet
      const realThs = Array.from(real.querySelectorAll('thead tr th')) as HTMLElement[];
      if (!measuredWidths.length && realThs.length) {
        measuredWidths = realThs.map((th) => th.getBoundingClientRect().width);
        measuredPaddings = realThs.map((th) => {
          try {
            const cs = window.getComputedStyle(th);
            return { left: cs.paddingLeft, right: cs.paddingRight };
          } catch (e) {
            return { left: '0px', right: '0px' };
          }
        });
      }

      const fixedThs = Array.from(fixed.querySelectorAll('thead tr th')) as HTMLElement[];
      // if counts mismatch, don't crash — attempt best-effort mapping
      const count = Math.min(measuredWidths.length || 0, fixedThs.length || 0);
      for (let i = 0; i < count; i++) {
        const w = measuredWidths[i];
        fixedThs[i].style.width = `${Math.round(w)}px`;
        fixedThs[i].style.boxSizing = 'border-box';
        // copy measured paddings (from TD or TH)
        if (measuredPaddings[i]) {
          fixedThs[i].style.paddingLeft = measuredPaddings[i].left;
          fixedThs[i].style.paddingRight = measuredPaddings[i].right;
        }
      }

      // hide the real table header to avoid double spacing (we use the fixed header)
      const realThead = real.querySelector('thead') as HTMLElement | null;
      if (realThead) realThead.style.display = 'none';

      // set table width explicitly on fixed table and enforce fixed table layout
      const fixedTableEl = fixed as HTMLElement;
      fixedTableEl.style.width = `${rt.width}px`;
      try {
        (fixedTableEl as HTMLTableElement).style.tableLayout = 'fixed';
      } catch (e) {}

  // set top padding on scroll container equal to fixed header height
  const fh = fixedContainer.getBoundingClientRect().height;
  container.style.paddingTop = `${fh}px`;

      // debug: print measured widths so we can inspect in devtools if needed
      try {
        console.debug('admin: header sync', { tableRect: rt, measuredWidths, measuredPaddings, fixedWidth: fixedTableEl.style.width });
      } catch (e) {}
    };

    // helper to run sync a few times to catch font/layout shifts
    const scheduleSyncBurst = () => {
      sync();
      // small delays to catch asynchronous font/layout changes
      setTimeout(sync, 50);
      setTimeout(sync, 200);
    };

    // run on mount and resize
    scheduleSyncBurst();

    // also run after fonts load if supported
    if ((document as any).fonts && (document as any).fonts.ready) {
      (document as any).fonts.ready.then(() => {
        scheduleSyncBurst();
      }).catch(() => {});
    }

    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [realTableRef.current, fixedTableRef.current, tableScrollRef.current, rows.length]);

  function handleLogout() {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('userName');
      localStorage.removeItem('userType');
    } catch (e) {
      // ignore storage errors
    }
    navigate('/');
  }

  // compute summary stats
  const summary = rows.reduce(
    (acc, r) => ({
      buses: acc.buses + 1,
      students: acc.students + (r.studentsTotal || 0),
      boys: acc.boys + (r.boys || 0),
      girls: acc.girls + (r.girls || 0),
      staff: acc.staff + (r.staff || 0),
    }),
    { buses: 0, students: 0, boys: 0, girls: 0, staff: 0 }
  );

  return (
    <>
  <div className="fixed inset-0 bg-gradient-to-b from-slate-50 via-white to-sky-50 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin — Bus Overview</h1>
              <p className="text-sm text-slate-500 mt-1">Quick view of buses, drivers, and passenger breakdowns. Click a row for details.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="secondary" onClick={handleLogout} className="text-sm">Logout</Button>
            </div>
          </div>

          {/* summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Buses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{summary.buses}</div>
                <div className="text-xs text-slate-500">Total buses in service</div>
              </CardContent>
            </Card>
            <Card className="p-4">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{summary.students}</div>
                <div className="text-xs text-slate-500">Total students assigned</div>
              </CardContent>
            </Card>
            <Card className="p-4">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Boys / Girls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 items-center">
                  <div className="text-lg font-bold text-sky-600">{summary.boys}</div>
                  <div className="text-lg font-bold text-pink-500">{summary.girls}</div>
                </div>
                <div className="text-xs text-slate-500">Male / Female counts</div>
              </CardContent>
            </Card>
            <Card className="p-4">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{summary.staff}</div>
                <div className="text-xs text-slate-500">Coordinators & faculty</div>
              </CardContent>
            </Card>
          </div>

          <div ref={tableScrollRef} className="bg-white rounded-lg shadow-sm border overflow-auto min-h-0">
            <div id="fixed-header" style={{position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60}} className="bg-white border-b">
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="text-sm font-medium text-slate-700">Routes</div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500">Showing {rows.length} routes</div>
                  <Button size="sm" variant="secondary" onClick={handleLogout} className="text-sm">Logout</Button>
                </div>
              </div>
              <div>
                <Table ref={fixedTableRef} className="min-w-full">
                  <TableHeader>
                    <TableRow>
                          <TableHead className="text-sm font-medium text-slate-800 text-left">Route</TableHead>
                          <TableHead className="text-sm text-slate-700 text-left">Bus</TableHead>
                          <TableHead className="text-sm text-slate-700 text-left">Driver</TableHead>
                          <TableHead className="text-sm text-slate-600 text-right pr-6">Capacity</TableHead>
                          <TableHead className="text-sm text-slate-800 text-right pr-6">Students</TableHead>
                          <TableHead className="text-sm text-sky-600 text-right">Boys</TableHead>
                          <TableHead className="text-sm text-pink-600 text-right">Girls</TableHead>
                          <TableHead className="text-sm text-emerald-600 text-right">Staff</TableHead>
                        </TableRow>
                  </TableHeader>
                </Table>
              </div>
            </div>

            <Table ref={realTableRef} className="min-w-full">
              <TableHeader className="invisible">
                <TableRow>
                  <TableHead className="text-sm font-medium text-slate-800 text-left">Route</TableHead>
                  <TableHead className="text-sm text-slate-700 text-left">Bus</TableHead>
                  <TableHead className="text-sm text-slate-700 text-left">Driver</TableHead>
                  <TableHead className="text-sm text-slate-600 text-right pr-6">Capacity</TableHead>
                  <TableHead className="text-sm text-slate-800 text-right pr-6">Total Students</TableHead>
                  <TableHead className="text-sm text-sky-600 text-right">Boys</TableHead>
                  <TableHead className="text-sm text-pink-600 text-right">Girls</TableHead>
                  <TableHead className="text-sm text-emerald-600 text-right">Staff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, idx) => (
                  <TableRow key={r.number} onClick={async () => {
                      setSelected({ number: r.number, loading: true });
                      try {
                        const resp = await fetch(`/routes/${r.number}`);
                        if (!resp.ok) {
                          const txt = await resp.text();
                          setSelected({ number: r.number, loading: false, error: txt || `Failed to load (${resp.status})` });
                          return;
                        }
                        const ct = resp.headers.get('content-type') || '';
                        if (!ct.includes('application/json')) {
                          const txt = await resp.text();
                          setSelected({ number: r.number, loading: false, error: txt || 'Server returned non-JSON' });
                          return;
                        }
                        const json = await resp.json();
                        if (json && json.success) setSelected({ number: r.number, loading: false, route: json.route });
                        else setSelected({ number: r.number, loading: false, error: json?.message || 'Failed to load' });
                      } catch (e: any) {
                        setSelected({ number: r.number, loading: false, error: e?.message || 'Network error' });
                      }
                    }}
                    className={
                      "cursor-pointer transition-colors duration-150 ease-in-out " +
                      (idx % 2 === 0
                        ? 'bg-white hover:bg-sky-50 hover:shadow-sm hover:scale-[1.001]'
                        : 'bg-slate-50 hover:bg-sky-100 hover:shadow-sm hover:scale-[1.001]')
                    }
                    role="button"
                    aria-label={`Open route ${r.number} details`}
                  >
                    <TableCell className="text-sm font-medium text-slate-800">{r.number}</TableCell>
                    <TableCell className="text-sm text-slate-700">{r.busNumber}</TableCell>
                    <TableCell className="text-sm text-slate-700">{r.driver}</TableCell>
                    <TableCell className="text-sm text-slate-600 text-right pr-6">{r.capacity}</TableCell>
                    <TableCell className="text-sm text-slate-800 text-right pr-6">{r.studentsTotal}</TableCell>
                    <TableCell className="text-sm text-sky-600 text-right">{r.boys}</TableCell>
                    <TableCell className="text-sm text-pink-600 text-right">{r.girls}</TableCell>
                    <TableCell className="text-sm text-emerald-600 text-right">{r.staff}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Right-hand details panel (small tab) shown when a route is selected */}
      {selected && (
        <div className="hidden md:block">
          <div className="fixed right-6 top-28 z-50">
            <div className="w-96 max-h-[78vh] overflow-auto bg-white border rounded-2xl shadow-lg">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div>
                  <div className="text-sm font-semibold">Route {selected.number}</div>
                  <div className="text-xs text-slate-500">Details & latest attendance</div>
                </div>
                <div>
                  <button className="text-sm px-3 py-1 rounded bg-slate-100 hover:bg-slate-200" onClick={() => setSelected(null)}>Close</button>
                </div>
              </div>
              <div className="p-4">
                {selected.loading ? (
                  <div>Loading...</div>
                ) : selected.error ? (
                  <div className="text-destructive">{selected.error}</div>
                ) : (
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-slate-500">Bus</div>
                        <div className="text-sm font-medium">{selected.route?.busNumber || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Driver</div>
                        <div className="text-sm font-medium">{selected.route?.driver || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Capacity</div>
                        <div className="text-sm font-medium">{selected.route?.capacity || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Students</div>
                        <div className="text-sm font-medium">{(selected.route?.students || []).length}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 mb-2">Staff</div>
                      <div className="space-y-2">
                        {(selected.route?.staff || []).map((f: any) => (
                          <div key={f.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">{(f.name || '?').slice(0,1)}</div>
                              <div>{f.name}</div>
                            </div>
                            <div className="text-xs text-slate-500">{f.seatNumber ? `Seat ${f.seatNumber}` : '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 mb-2">Students (sample)</div>
                      <div className="space-y-2 max-h-40 overflow-auto">
                        {(selected.route?.students || []).slice(0,40).map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">{(s.name || '?').slice(0,1)}</div>
                              <div className="truncate">
                                <span className={
                                  s.gender === 'female' ? 'text-pink-600 font-semibold' : s.gender === 'male' ? 'text-sky-700 font-semibold' : ''
                                }>{s.name}</span>
                              </div>
                            </div>
                            <div className="text-xs text-slate-500">{s.seatNumber ? `Seat ${s.seatNumber}` : '—'}</div>
                          </div>
                        ))}
                        {!(selected.route?.students || []).length && <div className="text-xs text-slate-400">No students listed</div>}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 mb-2">Recent attendance</div>
                      <div className="space-y-2 text-sm">
                        {(selected.route?.attendance || []).slice().reverse().slice(0,6).map((a: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="text-sm">{a.date}</div>
                            <div className="text-sm font-medium">{a.count} students</div>
                          </div>
                        ))}
                        {!((selected.route?.attendance || []).length) && <div className="text-xs text-slate-400">No attendance submitted yet</div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
