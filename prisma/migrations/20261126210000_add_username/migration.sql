-- AddUsername: demo accounts log in with a username (e.g. "demo"), not a student number,
-- so every real student number stays on the SSO verification path.
ALTER TABLE "User" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
