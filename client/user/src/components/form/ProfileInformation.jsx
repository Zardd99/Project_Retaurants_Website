import { forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { UserAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";

const ProfileInformation = forwardRef(({ isEmailVisible, isAdmin }, ref) => {
  const navigate = useNavigate();
  const { session, signOut } = UserAuth();

  //
  // handle log out
  //
  //
  const handleLogOut = async (e) => {
    e.preventDefault();
    try {
      await signOut();
      navigate("/");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      ref={ref}
      className={`email-popup bg-gradient-to-br from-hero-gray-900 via-hero-gray-800 to-hero-gray-900 text-hero-white border border-hero-red-500 shadow-xl w-65 md:w-100 h-auto absolute top-15 right-0 p-4 flex-col transition-all duration-300 rounded-lg ${
        isEmailVisible
          ? "opacity-100 translate-y-0 visible scale-100"
          : "opacity-0 -translate-y-4 invisible scale-95"
      }`}
      id="email"
    >
      <span className="cal-sans-bold text-2xl text-hero-red-500 mb-2 block">
        Profile Information
      </span>
      <br />
      <div className="cal-sans-bold mr-4 p-4 rounded-lg bg-hero-gray-800 border border-hero-red-400 mb-3 hover:bg-hero-gray-700 transition-colors">
        <span className="text-hero-red-400">User Name:</span>
        <span className="cal-sans-italic ml-4 cal-sans-regular text-hero-white">
          {session?.user?.email ? (
            <>
              {session.user.email.slice(0, 2)}
              <span className="mx-1">...</span>
              {session.user.email.split("@")[0].slice(-1)}
            </>
          ) : null}
        </span>
      </div>
      <div className="cal-sans-bold mr-4 p-4 rounded-lg bg-hero-gray-800 border border-hero-red-400 mb-3 hover:bg-hero-gray-700 transition-colors">
        <span className="text-hero-red-400">User Role:</span>
        {!isAdmin ? (
          <span className="cal-sans-italic ml-4 cal-sans-regular text-hero-white">
            User
          </span>
        ) : (
          <span className="cal-sans-italic ml-4 cal-sans-regular text-hero-red-300">
            Admin
          </span>
        )}
      </div>
      <div className="cal-sans-bold mr-4 p-4 rounded-lg bg-hero-gray-800 border border-hero-red-400 mb-3 hover:bg-hero-red-900 hover:border-hero-red-300 transition-colors">
        <Link
          to="/dashboard"
          className="text-hero-white hover:text-hero-red-300 transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
      <div className="cal-sans-bold mr-4 p-4 rounded-lg flex w-full justify-end items-end">
        <button
          onClick={handleLogOut}
          className="px-4 py-2 mx-2 bg-hero-red-600 text-hero-white hover:bg-hero-red-700 transition-colors rounded-md border border-hero-red-500 hover:border-hero-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
});

export default ProfileInformation;
