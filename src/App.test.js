import { render, screen } from "@testing-library/react";
import App from "./App";
import { useAuth } from "./AuthContext";

jest.mock("./AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("./Login", () => () => <div>Login Page</div>);
jest.mock("./Navbar", () => () => <div>Navbar</div>);
jest.mock("./pages/Home", () => () => <div>Home Page</div>);
jest.mock("./pages/Dashboard", () => () => <div>Dashboard Page</div>);
jest.mock("./pages/Activity", () => () => <div>Activity Page</div>);
jest.mock("./pages/Community", () => () => <div>Community Page</div>);
jest.mock("./pages/Quran", () => () => <div>Quran Page</div>);
jest.mock("./pages/SurahReader", () => () => <div>Surah Reader Page</div>);

describe("App", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows login page when user is not authenticated", () => {
    useAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<App />);

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Navbar")).not.toBeInTheDocument();
  });

  test("shows app shell when user is authenticated", () => {
    useAuth.mockReturnValue({
      user: { uid: "123", displayName: "Test User" },
      loading: false,
    });

    render(<App />);

    expect(screen.getByText("Navbar")).toBeInTheDocument();
    expect(screen.getByText("Home Page")).toBeInTheDocument();
  });
});
