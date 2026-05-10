import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIdentity } from "../contexts/IdentityContext";
import { shortenPubkey } from "../utils/keys";

export function Welcome() {
  const {
    isLoading,
    error,
    hasExtension,
    loginWithExtension,
    loginWithPrivateKey,
    generateAndLogin,
  } = useIdentity();

  const [showImport, setShowImport] = useState(false);
  const [importKey, setImportKey] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [generatedKeys, setGeneratedKeys] = useState<{ privateKey: string; pubkey: string; nsec: string; npub: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExtensionLogin = async () => {
    try {
      await loginWithExtension();
    } catch {
      // Error is handled in context
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const keys = await generateAndLogin();
      setGeneratedKeys(keys);
    } catch {
      // Error is handled in context
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImport = async () => {
    setImportError(null);
    try {
      await loginWithPrivateKey(importKey);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to import key");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show key backup screen after generation
  if (generatedKeys) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Save Your Keys!</CardTitle>
            <CardDescription>
              Write these down and keep them safe. You cannot recover your account without them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Secret Key (keep private!)</Label>
              <div className="p-3 bg-destructive/10 rounded-md font-mono text-xs break-all border border-destructive/20 select-all">
                {generatedKeys.nsec}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Public Key (your identity)</Label>
              <div className="p-3 bg-muted rounded-md font-mono text-xs break-all select-all">
                {generatedKeys.npub}
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => setGeneratedKeys(null)}
            >
              I've saved my keys - Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4">&#9816;</div>
          <CardTitle className="text-3xl">Chester</CardTitle>
          <CardDescription>
            Nostr-native chess. No accounts, no passwords.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Extension Login */}
          {hasExtension && (
            <Button
              variant="default"
              className="w-full"
              onClick={handleExtensionLogin}
            >
              Connect with Nostr Extension
            </Button>
          )}

          {/* Generate New Keys */}
          <Button
            variant={hasExtension ? "outline" : "default"}
            className="w-full"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate New Keys"}
          </Button>

          {/* Import Key Section */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {!showImport ? (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowImport(true)}
            >
              Import Existing Key
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="privateKey">Secret Key (nsec or hex)</Label>
                <Input
                  id="privateKey"
                  type="password"
                  placeholder="nsec1... or 64-character hex"
                  value={importKey}
                  onChange={(e) => setImportKey(e.target.value)}
                />
                {importError && (
                  <p className="text-sm text-destructive">{importError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowImport(false);
                    setImportKey("");
                    setImportError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleImport}
                  disabled={!importKey.trim()}
                >
                  Import
                </Button>
              </div>
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground pt-4">
            Your keys are stored locally and never sent to any server.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
