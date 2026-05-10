import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CreateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (type: string, colorPreference: string) => Promise<void>;
  isCreating: boolean;
}

export function CreateGameModal({ isOpen, onClose, onCreate, isCreating }: CreateGameModalProps) {
  const [gameType, setGameType] = useState<string>("public");
  const [colorPreference, setColorPreference] = useState<string>("random");

  if (!isOpen) return null;

  const handleCreate = async () => {
    await onCreate(gameType, colorPreference);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Game</CardTitle>
          <CardDescription>Set up a new game and wait for challengers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Game Type</Label>
            <Select value={gameType} onValueChange={setGameType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public - Anyone can join</SelectItem>
                <SelectItem value="private">Private - Share link to invite</SelectItem>
                <SelectItem value="ai">AI - Play against computer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Your Color</Label>
            <Select value={colorPreference} onValueChange={setColorPreference}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">Random</SelectItem>
                <SelectItem value="white">White (move first)</SelectItem>
                <SelectItem value="black">Black</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleCreate} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Game"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
