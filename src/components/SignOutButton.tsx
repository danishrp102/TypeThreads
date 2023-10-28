"use client"

import { ButtonHTMLAttributes, FC, useState } from 'react'
import Button from './ui/Button';
import { signOut } from 'next-auth/react';
import toast from 'react-hot-toast';
import { Loader2, LogOut } from 'lucide-react';
// import { redirect } from 'next/navigation';

interface SignOutButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  
}

const SignOutButton: FC<SignOutButtonProps> = ({...props}) => {
    const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
    // const history = useHistory();

  return (
    <Button {...props} variant="ghost" onClick={async () => {
        setIsSigningOut(true);
        try {
            await signOut();
            // redirect("/login");

            window.location.href = "/login";
        } catch (error) {
            toast.error("There was an error signing out");
        } finally {
            setIsSigningOut(false);
        }
    }}>
        {isSigningOut ? (
            <Loader2 className='animate-spin h-4 w-4' />
        ) : (
            <LogOut className='w-4 h-4' />
        )}
    </Button>
  )
}

export default SignOutButton;