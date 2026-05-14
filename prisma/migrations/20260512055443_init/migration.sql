-- CreateTable
CREATE TABLE "WatchedRoute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "travelDate" DATETIME NOT NULL,
    "cabin" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastChecked" DATETIME
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "watchedRouteId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_watchedRouteId_fkey" FOREIGN KEY ("watchedRouteId") REFERENCES "WatchedRoute" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
