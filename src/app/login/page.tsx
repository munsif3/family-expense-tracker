'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            router.push('/');
        } catch (err: any) {
            setError(err.message || (isSignUp ? 'Failed to sign up' : 'Failed to login'));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            router.push('/');
        } catch (err: any) {
            setError(err.message || 'Failed to login with Google');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">
                        {isSignUp ? 'Create an account' : 'Sign in'}
                    </CardTitle>
                    <p className="text-sm text-center text-muted-foreground">
                        {isSignUp ? 'Enter your details to get started' : 'Enter your credentials to access your Family Finance Manager'}
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isSignUp ? 'Sign up' : 'Sign in'} with Google
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                        </div>
                    </div>

                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <div className="flex items-center space-x-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                                <AlertCircle className="h-4 w-4" />
                                <span>{error}</span>
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSignUp ? 'Sign Up' : 'Sign In'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter>
                    <div className="text-sm text-center w-full text-muted-foreground">
                        {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                        <button
                            type="button"
                            className="underline text-primary hover:text-primary/80"
                            onClick={() => setIsSignUp(!isSignUp)}
                        >
                            {isSignUp ? 'Sign In' : 'Sign Up'}
                        </button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
