-- ====================================================================
-- PRIME TRUST LOGISTICS (PTL) - SUPABASE POSTGRESQL SCHEMA
-- Inter-State Logistics Operations System (Port Harcourt ⇄ Abia)
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Branches Table
CREATE TABLE IF NOT EXISTS "Branch" (
    "id" TEXT PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(10) UNIQUE NOT NULL, -- e.g. 'PHC', 'ABI'
    "address" TEXT NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255),
    "status" VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'INACTIVE'
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_branch_code" ON "Branch" ("code");

-- 3. Users & Staff Table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" VARCHAR(50) DEFAULT 'OPERATIONS_STAFF', -- 'SUPER_ADMIN', 'BRANCH_ADMIN', 'OPERATIONS_STAFF'
    "branchId" TEXT REFERENCES "Branch"("id") ON DELETE SET NULL,
    "phone" VARCHAR(50),
    "status" VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'INACTIVE', 'SUSPENDED'
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_user_email" ON "User" ("email");
CREATE INDEX IF NOT EXISTS "idx_user_branch" ON "User" ("branchId");

-- 4. Customers Table (Senders & Receivers)
CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT PRIMARY KEY,
    "fullName" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "altPhone" VARCHAR(50),
    "email" VARCHAR(255),
    "address" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_customer_phone" ON "Customer" ("phone");
CREATE INDEX IF NOT EXISTS "idx_customer_name" ON "Customer" ("fullName");

-- 5. Shipments / Parcels Table (Waybills)
CREATE TABLE IF NOT EXISTS "Shipment" (
    "id" TEXT PRIMARY KEY,
    "waybillNumber" VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'PTL-PHC-ABI-260914-0001'
    "originBranchId" TEXT NOT NULL REFERENCES "Branch"("id"),
    "destinationBranchId" TEXT NOT NULL REFERENCES "Branch"("id"),
    "senderId" TEXT NOT NULL REFERENCES "Customer"("id"),
    "receiverId" TEXT NOT NULL REFERENCES "Customer"("id"),
    "status" VARCHAR(50) DEFAULT 'AWAITING_DISPATCH', -- 'CREATED', 'AWAITING_DISPATCH', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED_AT_DESTINATION', 'READY_FOR_PICKUP', 'COLLECTED', 'ON_HOLD', 'RETURNED', 'CANCELLED'
    
    "parcelCategory" VARCHAR(100) DEFAULT 'General Parcel', -- 'General Parcel', 'Documents', 'Electronics', 'Clothing', 'Food Items', 'Fragile', 'Other'
    "description" TEXT NOT NULL,
    "packagesCount" INTEGER DEFAULT 1,
    "quantity" INTEGER DEFAULT 1,
    "weightKg" DOUBLE PRECISION,
    "declaredValue" DOUBLE PRECISION,
    "specialInstructions" TEXT,

    "transportCharge" DOUBLE PRECISION DEFAULT 0,
    "paymentStatus" VARCHAR(50) DEFAULT 'PAID', -- 'PAID', 'UNPAID', 'PARTIALLY_PAID'
    "paymentMethod" VARCHAR(50) DEFAULT 'CASH', -- 'CASH', 'TRANSFER', 'POS', 'OTHER'
    "amountPaid" DOUBLE PRECISION DEFAULT 0,
    "balanceAmount" DOUBLE PRECISION DEFAULT 0,

    "pickupCode" VARCHAR(20), -- 6-Digit Secret Security PIN
    "pickupCodeGeneratedAt" TIMESTAMP WITH TIME ZONE,
    "currentBranchId" TEXT REFERENCES "Branch"("id"),

    "createdById" TEXT NOT NULL REFERENCES "User"("id"),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_shipment_waybill" ON "Shipment" ("waybillNumber");
CREATE INDEX IF NOT EXISTS "idx_shipment_status" ON "Shipment" ("status");
CREATE INDEX IF NOT EXISTS "idx_shipment_origin" ON "Shipment" ("originBranchId");
CREATE INDEX IF NOT EXISTS "idx_shipment_destination" ON "Shipment" ("destinationBranchId");
CREATE INDEX IF NOT EXISTS "idx_shipment_created_at" ON "Shipment" ("createdAt");

-- 6. Shipment Status History (Audit Trail)
CREATE TABLE IF NOT EXISTS "ShipmentStatusHistory" (
    "id" TEXT PRIMARY KEY,
    "shipmentId" TEXT NOT NULL REFERENCES "Shipment"("id") ON DELETE CASCADE,
    "status" VARCHAR(50) NOT NULL,
    "branchId" TEXT REFERENCES "Branch"("id") ON DELETE SET NULL,
    "staffId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_status_history_shipment" ON "ShipmentStatusHistory" ("shipmentId");

-- 7. Manifests Table (Interstate Dispatches)
CREATE TABLE IF NOT EXISTS "Manifest" (
    "id" TEXT PRIMARY KEY,
    "manifestNumber" VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'MAN-PHC-ABI-260914-001'
    "originBranchId" TEXT NOT NULL REFERENCES "Branch"("id"),
    "destinationBranchId" TEXT NOT NULL REFERENCES "Branch"("id"),
    "status" VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'READY_FOR_DISPATCH', 'DISPATCHED', 'IN_TRANSIT', 'RECEIVED', 'CLOSED'
    
    "driverName" VARCHAR(255),
    "vehicleReg" VARCHAR(100),
    "driverPhone" VARCHAR(50),
    "notes" TEXT,
    "totalParcels" INTEGER DEFAULT 0,

    "createdById" TEXT NOT NULL REFERENCES "User"("id"),
    "dispatchedAt" TIMESTAMP WITH TIME ZONE,
    "dispatchedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "receivedAt" TIMESTAMP WITH TIME ZONE,
    "receivedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "receivingRemarks" TEXT,

    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_manifest_number" ON "Manifest" ("manifestNumber");
CREATE INDEX IF NOT EXISTS "idx_manifest_status" ON "Manifest" ("status");
CREATE INDEX IF NOT EXISTS "idx_manifest_origin" ON "Manifest" ("originBranchId");
CREATE INDEX IF NOT EXISTS "idx_manifest_destination" ON "Manifest" ("destinationBranchId");

-- 8. Manifest Shipments (Junction Table with Inspection Status)
CREATE TABLE IF NOT EXISTS "ManifestShipment" (
    "id" TEXT PRIMARY KEY,
    "manifestId" TEXT NOT NULL REFERENCES "Manifest"("id") ON DELETE CASCADE,
    "shipmentId" TEXT NOT NULL REFERENCES "Shipment"("id") ON DELETE CASCADE,
    "receivingStatus" VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'RECEIVED', 'MISSING', 'DAMAGED', 'ON_HOLD'
    "receivingRemarks" TEXT,
    "verifiedAt" TIMESTAMP WITH TIME ZONE,
    "verifiedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    CONSTRAINT "uq_manifest_shipment" UNIQUE ("manifestId", "shipmentId")
);

CREATE INDEX IF NOT EXISTS "idx_ms_manifest" ON "ManifestShipment" ("manifestId");
CREATE INDEX IF NOT EXISTS "idx_ms_shipment" ON "ManifestShipment" ("shipmentId");

-- 9. Pickup Verification Table
CREATE TABLE IF NOT EXISTS "PickupVerification" (
    "id" TEXT PRIMARY KEY,
    "shipmentId" TEXT NOT NULL REFERENCES "Shipment"("id") ON DELETE CASCADE,
    "pickupCode" VARCHAR(20) NOT NULL,
    "attempts" INTEGER DEFAULT 0,
    "isVerified" BOOLEAN DEFAULT FALSE,
    "verifiedAt" TIMESTAMP WITH TIME ZONE,
    "verifiedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_pickup_verification_shipment" ON "PickupVerification" ("shipmentId");

-- 10. Collections Table (Parcel Counter Handover)
CREATE TABLE IF NOT EXISTS "Collection" (
    "id" TEXT PRIMARY KEY,
    "shipmentId" TEXT UNIQUE NOT NULL REFERENCES "Shipment"("id") ON DELETE CASCADE,
    "collectorName" VARCHAR(255) NOT NULL,
    "collectorPhone" VARCHAR(50) NOT NULL,
    "relationship" VARCHAR(50) DEFAULT 'SELF', -- 'SELF', 'SPOUSE', 'COLLEAGUE', 'RELATIVE', 'AGENT', 'OTHER'
    "verificationMethod" VARCHAR(50) DEFAULT 'PICKUP_CODE', -- 'PICKUP_CODE', 'ID_VERIFICATION', 'ADMIN_OVERRIDE'
    "pickupCodeVerified" BOOLEAN DEFAULT TRUE,
    "idType" VARCHAR(100), -- 'NATIONAL_ID', 'DRIVERS_LICENSE', 'VOTERS_CARD', 'PASSPORT', 'OTHER'
    "idReference" VARCHAR(255),
    "releasedById" TEXT NOT NULL REFERENCES "User"("id"),
    "branchId" TEXT NOT NULL REFERENCES "Branch"("id"),
    "remarks" TEXT,
    "collectionDate" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_collection_shipment" ON "Collection" ("shipmentId");
CREATE INDEX IF NOT EXISTS "idx_collection_branch" ON "Collection" ("branchId");

-- 11. Payments Table
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT PRIMARY KEY,
    "shipmentId" TEXT NOT NULL REFERENCES "Shipment"("id") ON DELETE CASCADE,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" VARCHAR(50) DEFAULT 'CASH', -- 'CASH', 'TRANSFER', 'POS', 'OTHER'
    "paymentStatus" VARCHAR(50) DEFAULT 'PAID', -- 'PAID', 'PARTIAL', 'REFUNDED'
    "reference" VARCHAR(255),
    "recordedById" TEXT NOT NULL REFERENCES "User"("id"),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_payment_shipment" ON "Payment" ("shipmentId");

-- 12. Notifications Table (SMS / WhatsApp Delivery Logs)
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT PRIMARY KEY,
    "shipmentId" TEXT NOT NULL REFERENCES "Shipment"("id") ON DELETE CASCADE,
    "recipientPhone" VARCHAR(50) NOT NULL,
    "recipientName" VARCHAR(255) NOT NULL,
    "channel" VARCHAR(50) DEFAULT 'SMS', -- 'SMS', 'WHATSAPP', 'EMAIL', 'MANUAL'
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "deliveryStatus" VARCHAR(50) DEFAULT 'SENT' -- 'SENT', 'DELIVERED', 'PENDING', 'FAILED'
);

CREATE INDEX IF NOT EXISTS "idx_notification_shipment" ON "Notification" ("shipmentId");

-- 13. Audit Logs Table (Full Chain-of-Custody History)
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "userName" VARCHAR(255),
    "userEmail" VARCHAR(255),
    "userRole" VARCHAR(50),
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" VARCHAR(255) NOT NULL,
    "branchId" TEXT REFERENCES "Branch"("id") ON DELETE SET NULL,
    "branchCode" VARCHAR(50),
    "details" TEXT,
    "previousValue" TEXT,
    "newValue" TEXT,
    "ipAddress" VARCHAR(100),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_audit_user" ON "AuditLog" ("userId");
CREATE INDEX IF NOT EXISTS "idx_audit_action" ON "AuditLog" ("action");
CREATE INDEX IF NOT EXISTS "idx_audit_entity" ON "AuditLog" ("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "idx_audit_created_at" ON "AuditLog" ("createdAt");

-- 14. System Settings Table
CREATE TABLE IF NOT EXISTS "SystemSetting" (
    "id" TEXT PRIMARY KEY,
    "key" VARCHAR(100) UNIQUE NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_system_setting_key" ON "SystemSetting" ("key");

-- 15. Sequence Counters Table (Atomic Counter for Waybills & Manifests)
CREATE TABLE IF NOT EXISTS "SequenceCounter" (
    "id" TEXT PRIMARY KEY,
    "type" VARCHAR(50) NOT NULL, -- 'WAYBILL', 'MANIFEST'
    "prefix" VARCHAR(100) NOT NULL, -- e.g. 'PTL-PHC-ABI-260914'
    "currentNumber" INTEGER DEFAULT 0,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_sequence_type_prefix" UNIQUE ("type", "prefix")
);

-- ====================================================================
-- SEED INITIAL DATA (Branches, System Settings & Staff Accounts)
-- Default password for all seed accounts: password123
-- ====================================================================

-- 1. Insert Branches
INSERT INTO "Branch" ("id", "name", "code", "address", "phone", "email", "status", "createdAt", "updatedAt")
VALUES
    ('branch-phc-01', 'Port Harcourt Office', 'PHC', 'Plot 14 Aba Road, Rumuokwuta, Port Harcourt, Rivers State', '+234 803 111 2233', 'phc@logisticsops.ng', 'ACTIVE', NOW(), NOW()),
    ('branch-abi-01', 'Abia Office', 'ABI', '58 Factory Road, Commercial Layout, Aba, Abia State', '+234 802 444 5566', 'abi@logisticsops.ng', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("code") DO UPDATE SET
    "name" = EXCLUDED."name",
    "address" = EXCLUDED."address",
    "phone" = EXCLUDED."phone",
    "email" = EXCLUDED."email",
    "status" = EXCLUDED."status";

-- 2. Insert Default Staff Users (Password Hash for 'password123': $2a$10$mXmxnd2FFrxMxblqpPeLuOYpaqtupGDO0ZwAdqBLhazJqUmm2wlfy)
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "branchId", "phone", "status", "createdAt", "updatedAt")
VALUES
    ('user-admin-01', 'Emeka Okafor', 'admin@logisticsops.ng', '$2a$10$mXmxnd2FFrxMxblqpPeLuOYpaqtupGDO0ZwAdqBLhazJqUmm2wlfy', 'SUPER_ADMIN', 'branch-phc-01', '+234 803 999 0001', 'ACTIVE', NOW(), NOW()),
    ('user-admin-02', 'System Administrator', 'admin@primetrust.com', '$2a$10$mXmxnd2FFrxMxblqpPeLuOYpaqtupGDO0ZwAdqBLhazJqUmm2wlfy', 'SUPER_ADMIN', 'branch-phc-01', '+234 800 000 0000', 'ACTIVE', NOW(), NOW()),
    ('user-phc-admin', 'Tamuno Briggs', 'phc.admin@logisticsops.ng', '$2a$10$mXmxnd2FFrxMxblqpPeLuOYpaqtupGDO0ZwAdqBLhazJqUmm2wlfy', 'BRANCH_ADMIN', 'branch-phc-01', '+234 803 999 0002', 'ACTIVE', NOW(), NOW()),
    ('user-phc-staff', 'Chidiebere Nwosu', 'phc.staff@logisticsops.ng', '$2a$10$mXmxnd2FFrxMxblqpPeLuOYpaqtupGDO0ZwAdqBLhazJqUmm2wlfy', 'OPERATIONS_STAFF', 'branch-phc-01', '+234 803 999 0003', 'ACTIVE', NOW(), NOW()),
    ('user-abi-admin', 'Ngozi Ebere', 'abi.admin@logisticsops.ng', '$2a$10$mXmxnd2FFrxMxblqpPeLuOYpaqtupGDO0ZwAdqBLhazJqUmm2wlfy', 'BRANCH_ADMIN', 'branch-abi-01', '+234 802 888 0001', 'ACTIVE', NOW(), NOW()),
    ('user-abi-staff', 'Kalu Uzor', 'abi.staff@logisticsops.ng', '$2a$10$mXmxnd2FFrxMxblqpPeLuOYpaqtupGDO0ZwAdqBLhazJqUmm2wlfy', 'OPERATIONS_STAFF', 'branch-abi-01', '+234 802 888 0002', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("email") DO UPDATE SET
    "name" = EXCLUDED."name",
    "passwordHash" = EXCLUDED."passwordHash",
    "role" = EXCLUDED."role",
    "branchId" = EXCLUDED."branchId",
    "status" = EXCLUDED."status";

-- 3. Insert System Settings
INSERT INTO "SystemSetting" ("id", "key", "value", "description", "updatedAt")
VALUES
    ('set-01', 'COMPANY_NAME', 'LOGISTICS OPERATIONS SYSTEM', 'Official display company name', NOW()),
    ('set-02', 'COMPANY_CODE', 'PTL', 'Default company code prefix for waybills', NOW()),
    ('set-03', 'COMPANY_PHONE', '+234 800 564 4784', 'Customer care line', NOW()),
    ('set-04', 'COMPANY_EMAIL', 'operations@logisticsops.ng', 'Operations contact email', NOW()),
    ('set-05', 'COMPANY_ADDRESS', 'Head Office: Plot 14 Aba Road, Port Harcourt, Rivers State', 'Head office address', NOW()),
    ('set-06', 'CURRENCY_SYMBOL', '₦', 'Currency display symbol', NOW()),
    ('set-07', 'WAYBILL_TERMS', '1. All parcels are received in apparent good condition unless noted. 2. Company liability is strictly limited to verified declared value. 3. Parcels not collected within 14 calendar days from arrival date will incur statutory demurrage fees. 4. Valid government identification or secret pickup code is required for parcel release.', 'Standard terms printed on waybills', NOW()),
    ('set-08', 'NOTIFICATION_TEMPLATE', 'Your parcel with waybill {{waybillNumber}} from {{originBranch}} has arrived at our {{destinationBranch}} office and is ready for collection. Pickup Code: {{pickupCode}}. Please present this message at the counter.', 'Default SMS notification template', NOW())
ON CONFLICT ("key") DO UPDATE SET
    "value" = EXCLUDED."value",
    "description" = EXCLUDED."description",
    "updatedAt" = NOW();

