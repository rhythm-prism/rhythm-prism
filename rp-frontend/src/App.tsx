import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import type { ChartSearchParams } from "./types/chart";
import { PERMISSION, RATING_MAX, RATING_MIN } from "./lib/constants";
import { useChartSearch } from "./hooks/useChartSearch";
import Header from "./components/Header";
import Slider from "./components/Slider";
import ChartResults from "./components/ChartResults";
import ChartDetail from "./components/ChartDetail";
import EditChart from "./components/EditChart";
import SubmitChart from "./components/SubmitChart";
import SubmitAnnouncement from "./components/SubmitAnnouncement";
import AnnouncementList from "./components/AnnouncementList";
import EditAnnouncement from "./components/EditAnnouncement";
import SearchPage from "./components/SearchPage";
import MyCharts from "./components/MyCharts";
import CharterRequests from "./components/CharterRequests";
import CharterPastRequests from "./components/CharterPastRequests";
import CharterPendingRequests from "./components/CharterPendingRequests";
import CharterApply from "./components/CharterApply";
import CharterStatus from "./components/CharterStatus";
import EditProfile from "./components/EditProfile";
import UserProfile from "./components/UserProfile";
import SettingsLayout from "./components/SettingsLayout";
import ModerationUsers from "./components/ModerationUsers";
import ServerInfo from "./components/ServerInfo";
import Terms from "./components/Terms";
import LoginModal from "./components/LoginModal";
import SonolusLinkModal from "./components/SonolusLinkModal";
import Footer from "./components/Footer";
import AuthProvider from "./auth/AuthProvider";
import { useAuth } from "./auth/context";

// Stable reference so the "latest charts" list on the home screen fetches once per mount.
const LATEST_PARAMS: ChartSearchParams = {
  sortType: "new",
  order: "desc",
  keywords: "",
  minRating: RATING_MIN,
  maxRating: RATING_MAX,
  r18: false,
  collabo: false,
  difficultyIds: [],
  genreIds: [],
  limit: 20,
};

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

/** Redirects to `/` and reports denial (e.g. to open the login modal) when logged out. */
function RequireAuth({ children, onDenied }: { children: ReactNode; onDenied: () => void }) {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) onDenied();
  }, [loading, user, onDenied]);

  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Redirects to `/` for anyone below moderator (no denial UI needed here). */
function RequireModerator({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || (user.permission ?? 0) < PERMISSION.MODERATOR) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Redirects to `/` for anyone below authorized charter (charter application reviewers). */
function RequireCharterReviewer({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || (user.permission ?? 0) < PERMISSION.AUTHORIZED_CHARTER) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Redirects to `/` unless the user has exactly NORMAL permission (charter application flow). */
function RequireNormal({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || (user.permission ?? PERMISSION.NORMAL) !== PERMISSION.NORMAL) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function HomePage({ onSelectChart }: { onSelectChart: (chartId: string) => void }) {
  const latest = useChartSearch(LATEST_PARAMS);
  return (
    <div className="space-y-8">
      <Slider />
      <section className="space-y-6">
        <h2 className="text-xl font-bold">新着譜面</h2>
        <ChartResults state={latest} onSelect={onSelectChart} />
      </section>
    </div>
  );
}

function ChartDetailPage({
  onSelectUser,
  onEdit,
}: {
  onSelectUser: (userId: string) => void;
  onEdit: (chartId: string) => void;
}) {
  const { chartId } = useParams<{ chartId: string }>();
  const navigate = useNavigate();
  if (!chartId) return <Navigate to="/" replace />;
  return (
    <ChartDetail
      chartId={chartId}
      onBack={() => navigate(-1)}
      onEdit={() => onEdit(chartId)}
      onSelectUser={onSelectUser}
    />
  );
}

function EditChartPage({
  onSaved,
  onDeleted,
}: {
  onSaved: (chartId: string) => void;
  onDeleted: () => void;
}) {
  const { chartId } = useParams<{ chartId: string }>();
  const navigate = useNavigate();
  if (!chartId) return <Navigate to="/" replace />;
  return (
    <EditChart
      chartId={chartId}
      onBack={() => navigate(-1)}
      onSaved={() => onSaved(chartId)}
      onDeleted={onDeleted}
    />
  );
}

function UserProfilePage({
  onSelectChart,
  onEdit,
}: {
  onSelectChart: (chartId: string) => void;
  onEdit: () => void;
}) {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  if (!userId) return <Navigate to="/" replace />;
  return (
    <UserProfile
      userId={userId}
      onBack={() => navigate(-1)}
      onSelectChart={onSelectChart}
      onEdit={onEdit}
    />
  );
}

function CharterStatusPage({
  onApplyClick,
  onSelectChart,
  onSelectUser,
}: {
  onApplyClick: () => void;
  onSelectChart: (chartId: string) => void;
  onSelectUser: (userId: string) => void;
}) {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  if (!requestId) return <Navigate to="/auth/charter/requests" replace />;
  return (
    <CharterStatus
      requestId={requestId}
      onBack={() => navigate(-1)}
      onApplyClick={onApplyClick}
      onSelectChart={onSelectChart}
      onSelectUser={onSelectUser}
    />
  );
}

function ModerationUsersPage({ onSelectUser }: { onSelectUser: (userId: string) => void }) {
  const navigate = useNavigate();
  return <ModerationUsers onBack={() => navigate(-1)} onSelectUser={onSelectUser} />;
}

function ModerationUserEditPage({ onSaved }: { onSaved: () => void }) {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  if (!userId) return <Navigate to="/moderation/users" replace />;
  return <EditProfile userId={userId} onBack={() => navigate(-1)} onSaved={onSaved} />;
}

function EditAnnouncementPage({
  onSaved,
  onDeleted,
}: {
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  if (!postId) return <Navigate to="/announcements" replace />;
  return (
    <EditAnnouncement
      postId={postId}
      onBack={() => navigate(-1)}
      onSaved={onSaved}
      onDeleted={onDeleted}
    />
  );
}

function AppShell() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loginOpen, setLoginOpen] = useState(false);

  const requireUser = (path: string) => {
    if (!user) {
      setLoginOpen(true);
      return;
    }
    navigate(path);
  };

  const goBrowse = () => navigate("/");
  const goSearch = () => navigate("/search");
  const goSubmit = () => requireUser("/submit");
  const goAnnouncements = () => navigate("/announcements");
  const goSubmitAnnouncement = () => navigate("/announcements/new");
  const goEditAnnouncement = (postId: string) =>
    navigate(`/announcements/${encodeURIComponent(postId)}/edit`);
  const goEditProfile = () => requireUser("/profile");
  const goMine = () => requireUser("/mine");
  const goDetail = (chartId: string) => navigate(`/chart/${encodeURIComponent(chartId)}`);
  const goUserProfile = (userId: string) => navigate(`/user/${encodeURIComponent(userId)}`);
  const goMyProfile = () => {
    if (!user) {
      setLoginOpen(true);
      return;
    }
    goUserProfile(user.id);
  };
  const goEdit = (chartId: string) => navigate(`/chart/${encodeURIComponent(chartId)}/edit`);
  const goCharterRequests = () => requireUser("/auth/charter/requests");
  const goCharterPending = () => requireUser("/auth/charter/requests/pending");
  const goCharterApply = () => requireUser("/auth/charter/apply");
  const goCharterStatus = (requestId: string) =>
    requireUser(`/auth/charter/status/${encodeURIComponent(requestId)}`);
  const goModerationUserEdit = (userId: string) =>
    navigate(`/moderation/users/${encodeURIComponent(userId)}`);

  const afterChartSaved = (chartId: string) => {
    navigate(`/chart/${encodeURIComponent(chartId)}`, { replace: true });
  };
  const afterPosted = () => {
    if (user) goUserProfile(user.id);
  };
  const afterAnnouncementPosted = () => goAnnouncements();
  const afterAnnouncementSaved = () => goAnnouncements();
  const afterProfileSaved = () => {
    if (user) goUserProfile(user.id);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Header
        onSubmitClick={goSubmit}
        onSearchClick={goSearch}
        onLogoClick={goBrowse}
        onLoginClick={() => setLoginOpen(true)}
        onProfileClick={goMyProfile}
        onMineClick={goMine}
        onCharterClick={goCharterRequests}
        onCharterPendingClick={goCharterPending}
        onManagementClick={goAnnouncements}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <Routes>
          <Route path="/" element={<HomePage onSelectChart={goDetail} />} />
          <Route
            path="/search"
            element={<SearchPage onSelectChart={goDetail} onBack={() => navigate(-1)} />}
          />
          <Route
            path="/chart/:chartId"
            element={<ChartDetailPage onSelectUser={goUserProfile} onEdit={goEdit} />}
          />
          <Route
            path="/chart/:chartId/edit"
            element={
              <RequireAuth onDenied={() => setLoginOpen(true)}>
                <EditChartPage onSaved={afterChartSaved} onDeleted={goBrowse} />
              </RequireAuth>
            }
          />
          <Route
            path="/user/:userId"
            element={<UserProfilePage onSelectChart={goDetail} onEdit={goEditProfile} />}
          />
          <Route
            path="/submit"
            element={
              <RequireAuth onDenied={() => setLoginOpen(true)}>
                <SubmitChart onBack={() => navigate(-1)} onPosted={afterPosted} defaultDisplayName={user?.name ?? ""} />
              </RequireAuth>
            }
          />
          <Route
            path="/auth/charter/apply"
            element={
              <RequireAuth onDenied={() => setLoginOpen(true)}>
                <RequireNormal>
                  <CharterApply
                    userId={user?.id ?? ""}
                    onBack={goCharterRequests}
                    onApplied={(requestId) =>
                      navigate(`/auth/charter/status/${encodeURIComponent(requestId)}`, { replace: true })
                    }
                    onStatusClick={goCharterStatus}
                    onSubmitClick={goSubmit}
                  />
                </RequireNormal>
              </RequireAuth>
            }
          />
          <Route
            path="/auth/charter/status/:requestId"
            element={
              <RequireAuth onDenied={() => setLoginOpen(true)}>
                <CharterStatusPage
                  onApplyClick={goCharterApply}
                  onSelectChart={goDetail}
                  onSelectUser={goUserProfile}
                />
              </RequireAuth>
            }
          />
          <Route
            path="/announcements/new"
            element={
              <RequireModerator>
                <SubmitAnnouncement
                  onBack={() => navigate(-1)}
                  onPosted={afterAnnouncementPosted}
                  defaultDisplayName={user?.name ?? ""}
                />
              </RequireModerator>
            }
          />
          <Route
            path="/announcements/:postId/edit"
            element={
              <RequireModerator>
                <EditAnnouncementPage
                  onSaved={afterAnnouncementSaved}
                  onDeleted={goAnnouncements}
                />
              </RequireModerator>
            }
          />
          <Route
            path="/moderation/users/:userId"
            element={
              <RequireModerator>
                <ModerationUserEditPage onSaved={() => navigate("/moderation/users")} />
              </RequireModerator>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth onDenied={() => setLoginOpen(true)}>
                <EditProfile onBack={() => navigate(-1)} onSaved={afterProfileSaved} />
              </RequireAuth>
            }
          />
          <Route
            path="/mine"
            element={
              <RequireAuth onDenied={() => setLoginOpen(true)}>
                <MyCharts onBack={() => navigate(-1)} onSubmitClick={goSubmit} onSelectChart={goDetail} />
              </RequireAuth>
            }
          />
          <Route
            path="/auth/charter/requests"
            element={
              <RequireAuth onDenied={() => setLoginOpen(true)}>
                {(user?.permission ?? PERMISSION.NORMAL) >= PERMISSION.MODERATOR ? (
                  <CharterPastRequests
                    onBack={() => navigate(-1)}
                    onSelectRequest={goCharterStatus}
                  />
                ) : (
                  <CharterRequests
                    userId={user?.id ?? ""}
                    onBack={() => navigate(-1)}
                    onApplyClick={goCharterApply}
                    onSelectRequest={goCharterStatus}
                  />
                )}
              </RequireAuth>
            }
          />
          <Route
            path="/auth/charter/requests/pending"
            element={
              <RequireAuth onDenied={() => setLoginOpen(true)}>
                <RequireCharterReviewer>
                  <CharterPendingRequests
                    onBack={() => navigate(-1)}
                    onSelectRequest={goCharterStatus}
                  />
                </RequireCharterReviewer>
              </RequireAuth>
            }
          />

          {/* お知らせ管理・ユーザー管理（運営管理）は左サイドバー付きの共通レイアウトにまとめる。 */}
          <Route element={<SettingsLayout />}>
            <Route
              path="/announcements"
              element={
                <RequireModerator>
                  <AnnouncementList
                    onBack={() => navigate(-1)}
                    onCreate={goSubmitAnnouncement}
                    onEdit={goEditAnnouncement}
                  />
                </RequireModerator>
              }
            />
            <Route
              path="/moderation/users"
              element={
                <RequireModerator>
                  <ModerationUsersPage onSelectUser={goModerationUserEdit} />
                </RequireModerator>
              }
            />
            <Route
              path="/moderation/server"
              element={
                <RequireModerator>
                  <ServerInfo onBack={() => navigate(-1)} />
                </RequireModerator>
              }
            />
          </Route>

          <Route path="/terms" element={<Terms />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />

      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
      {user && !user.sonolusId && <SonolusLinkModal />}
    </div>
  );
}
