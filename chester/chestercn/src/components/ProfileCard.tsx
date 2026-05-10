import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerProfile } from "../hooks/useProfile";

interface ProfileCardProps {
  profile: PlayerProfile | null;
  isLoading?: boolean;
  compact?: boolean;
}

export function ProfileCard({ profile, isLoading, compact }: ProfileCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Not connected</p>
        </CardContent>
      </Card>
    );
  }

  const winRate = profile.gamesPlayed > 0
    ? ((profile.wins / profile.gamesPlayed) * 100).toFixed(0)
    : "0";

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium">{Math.round(profile.rating)}</span>
        <span className="text-muted-foreground">
          {profile.wins}W / {profile.losses}L / {profile.draws}D
        </span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Rating</span>
          <span className="font-mono font-medium">
            {Math.round(profile.rating)}
            <span className="text-xs text-muted-foreground ml-1">
              ±{Math.round(profile.ratingDeviation)}
            </span>
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Games</span>
          <span className="font-mono">{profile.gamesPlayed}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">W / L / D</span>
          <span className="font-mono">
            {profile.wins} / {profile.losses} / {profile.draws}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Win Rate</span>
          <span className="font-mono">{winRate}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
