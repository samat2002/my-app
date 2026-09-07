import Image from 'next/image';
import { Suspense } from 'react';
import InputForm from './inputForm';

const Login = () => {
    return (
        <div className="flex justify-between min-h-screen">
            {/* Left section */}
            <div className="w-full md:w-1/2 flex justify-center">
                <div className="flex flex-col items-center justify-center w-3/5">
                    <div className="flex flex-col items-center py-2 w-full">
                        <h1 className="text-2xl font-bold">Log in</h1>
                        {/* <p className="opacity-70"></p> */}
                    </div>

                    <Suspense fallback={<div>Loading form...</div>}>
                        <InputForm />
                    </Suspense>
                </div>
            </div>

            {/* Right section */}
            <div className="hidden md:block md:w-1/2 bg-gray-300 border">
                <div className="flex justify-center items-center h-full">
                    <div className="relative w-full min-h-full">
                        <Image
                            src={'/robin.jpg'}
                            alt="image"
                            fill
                            quality={100}
                            className="object-cover min-h-full"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;