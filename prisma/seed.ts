import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Seed System Settings
  const settings = [
    { key: "COMPANY_NAME", value: "LOGISTICS OPERATIONS SYSTEM", description: "Official display company name" },
    { key: "COMPANY_CODE", value: "PTL", description: "Default company code prefix for waybills" },
    { key: "COMPANY_PHONE", value: "+234 800 564 4784", description: "Customer care line" },
    { key: "COMPANY_EMAIL", value: "operations@logisticsops.ng", description: "Operations contact email" },
    { key: "COMPANY_ADDRESS", value: "Head Office: Plot 14 Aba Road, Port Harcourt, Rivers State", description: "Head office address" },
    { key: "CURRENCY_SYMBOL", value: "₦", description: "Currency display symbol" },
    {
      key: "WAYBILL_TERMS",
      value: "1. All parcels are received in apparent good condition unless noted. 2. Company liability is strictly limited to verified declared value. 3. Parcels not collected within 14 calendar days from arrival date will incur statutory demurrage fees. 4. Valid government identification or secret pickup code is required for parcel release.",
      description: "Standard terms printed on waybills",
    },
    {
      key: "NOTIFICATION_TEMPLATE",
      value: "Your parcel with waybill {{waybillNumber}} from {{originBranch}} has arrived at our {{destinationBranch}} office and is ready for collection. Pickup Code: {{pickupCode}}. Please present this message at the counter.",
      description: "Default SMS/WhatsApp customer notification template",
    },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: s,
    });
  }
  console.log("✅ System settings seeded");

  // 2. Seed Branches
  const phcBranch = await prisma.branch.upsert({
    where: { code: "PHC" },
    update: {},
    create: {
      name: "Port Harcourt Office",
      code: "PHC",
      address: "Plot 14 Aba Road, Rumuokwuta, Port Harcourt, Rivers State",
      phone: "+234 803 111 2233",
      email: "phc@logisticsops.ng",
      status: "ACTIVE",
    },
  });

  const abiBranch = await prisma.branch.upsert({
    where: { code: "ABI" },
    update: {},
    create: {
      name: "Abia Office",
      code: "ABI",
      address: "58 Factory Road, Commercial Layout, Aba, Abia State",
      phone: "+234 802 444 5566",
      email: "abi@logisticsops.ng",
      status: "ACTIVE",
    },
  });

  console.log("✅ Branches seeded (PHC, ABI)");

  // 3. Seed Users
  const passwordHash = await bcrypt.hash("password123", 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@logisticsops.ng" },
    update: { passwordHash },
    create: {
      name: "Emeka Okafor",
      email: "admin@logisticsops.ng",
      passwordHash,
      role: "SUPER_ADMIN",
      phone: "+234 803 999 0001",
      branchId: phcBranch.id,
      status: "ACTIVE",
    },
  });

  const phcAdmin = await prisma.user.upsert({
    where: { email: "phc.admin@logisticsops.ng" },
    update: { passwordHash },
    create: {
      name: "Tamuno Briggs",
      email: "phc.admin@logisticsops.ng",
      passwordHash,
      role: "BRANCH_ADMIN",
      phone: "+234 803 999 0002",
      branchId: phcBranch.id,
      status: "ACTIVE",
    },
  });

  const phcStaff = await prisma.user.upsert({
    where: { email: "phc.staff@logisticsops.ng" },
    update: { passwordHash },
    create: {
      name: "Chidiebere Nwosu",
      email: "phc.staff@logisticsops.ng",
      passwordHash,
      role: "OPERATIONS_STAFF",
      phone: "+234 803 999 0003",
      branchId: phcBranch.id,
      status: "ACTIVE",
    },
  });

  const abiAdmin = await prisma.user.upsert({
    where: { email: "abi.admin@logisticsops.ng" },
    update: { passwordHash },
    create: {
      name: "Ngozi Ebere",
      email: "abi.admin@logisticsops.ng",
      passwordHash,
      role: "BRANCH_ADMIN",
      phone: "+234 802 888 0001",
      branchId: abiBranch.id,
      status: "ACTIVE",
    },
  });

  const abiStaff = await prisma.user.upsert({
    where: { email: "abi.staff@logisticsops.ng" },
    update: { passwordHash },
    create: {
      name: "Kalu Uzor",
      email: "abi.staff@logisticsops.ng",
      passwordHash,
      role: "OPERATIONS_STAFF",
      phone: "+234 802 888 0002",
      branchId: abiBranch.id,
      status: "ACTIVE",
    },
  });

  console.log("✅ Users seeded (Super Admin, Branch Admins & Staff)");

  // 4. Seed Customers
  const customer1 = await prisma.customer.create({
    data: {
      fullName: "Alhaji Musa Danjuma",
      phone: "08032345678",
      altPhone: "08092345678",
      email: "musa.danjuma@gmail.com",
      address: "12 Trans-Amadi Industrial Layout, Port Harcourt",
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      fullName: "Dr. Ifeanyi Adeleke",
      phone: "08023456789",
      altPhone: "08183456789",
      email: "ifeanyi.adeleke@yahoo.com",
      address: "44 Azikiwe Road, Aba, Abia State",
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      fullName: "Mrs. Folashade Balogun",
      phone: "08054567890",
      email: "folashade.b@outlook.com",
      address: "7 Peter Odili Road, Port Harcourt",
    },
  });

  const customer4 = await prisma.customer.create({
    data: {
      fullName: "Chief Obinna Eze",
      phone: "08125678901",
      email: "obinna.eze@ariariamarket.ng",
      address: "Zone 3, Ariaria International Market, Aba",
    },
  });

  const customer5 = await prisma.customer.create({
    data: {
      fullName: "Blessing Amadi",
      phone: "09036789012",
      address: "24 Olu Obasanjo Way, Port Harcourt",
    },
  });

  const customer6 = await prisma.customer.create({
    data: {
      fullName: "Engr. Victor Briggs",
      phone: "08088901234",
      address: "GRA Phase 2, Port Harcourt",
    },
  });

  console.log("✅ Customers seeded");

  // 5. Seed Historical Shipments & Manifests
  // Shipment 1: Collected
  const s1 = await prisma.shipment.create({
    data: {
      waybillNumber: "PTL-PHC-ABI-260910-0001",
      originBranchId: phcBranch.id,
      destinationBranchId: abiBranch.id,
      senderId: customer1.id,
      receiverId: customer2.id,
      status: "COLLECTED",
      parcelCategory: "Electronics",
      description: "2 Cartons Solar Inverters & Charge Controllers (Luminous 1.5KVA)",
      packagesCount: 2,
      quantity: 2,
      weightKg: 24.5,
      declaredValue: 350000,
      transportCharge: 18500,
      paymentStatus: "PAID",
      paymentMethod: "CASH",
      amountPaid: 18500,
      balanceAmount: 0,
      pickupCode: "492014",
      pickupCodeGeneratedAt: new Date(Date.now() - 2 * 86400000),
      currentBranchId: abiBranch.id,
      createdById: phcStaff.id,
      createdAt: new Date(Date.now() - 3 * 86400000),
    },
  });

  await prisma.shipmentStatusHistory.createMany({
    data: [
      { shipmentId: s1.id, status: "CREATED", branchId: phcBranch.id, staffId: phcStaff.id, remarks: "Waybill registered at Port Harcourt counter", createdAt: new Date(Date.now() - 3 * 86400000) },
      { shipmentId: s1.id, status: "AWAITING_DISPATCH", branchId: phcBranch.id, staffId: phcStaff.id, remarks: "Packaged and staged in warehouse Bay 2", createdAt: new Date(Date.now() - 3 * 86400000 + 3600000) },
      { shipmentId: s1.id, status: "DISPATCHED", branchId: phcBranch.id, staffId: phcAdmin.id, remarks: "Loaded into Manifest MAN-PHC-ABI-260910-001", createdAt: new Date(Date.now() - 2 * 86400000) },
      { shipmentId: s1.id, status: "IN_TRANSIT", branchId: phcBranch.id, staffId: phcAdmin.id, remarks: "En route to Aba Office via Express Van", createdAt: new Date(Date.now() - 2 * 86400000 + 1800000) },
      { shipmentId: s1.id, status: "ARRIVED_AT_DESTINATION", branchId: abiBranch.id, staffId: abiStaff.id, remarks: "Arrived at Aba Hub, verified intact", createdAt: new Date(Date.now() - 2 * 86400000 + 14400000) },
      { shipmentId: s1.id, status: "READY_FOR_PICKUP", branchId: abiBranch.id, staffId: abiStaff.id, remarks: "Customer notified via SMS notification", createdAt: new Date(Date.now() - 2 * 86400000 + 15000000) },
      { shipmentId: s1.id, status: "COLLECTED", branchId: abiBranch.id, staffId: abiStaff.id, remarks: "Collected by Dr. Ifeanyi Adeleke with valid pickup PIN", createdAt: new Date(Date.now() - 86400000) },
    ],
  });

  await prisma.collection.create({
    data: {
      shipmentId: s1.id,
      collectorName: "Dr. Ifeanyi Adeleke",
      collectorPhone: "08023456789",
      relationship: "SELF",
      verificationMethod: "PICKUP_CODE",
      pickupCodeVerified: true,
      idType: "NATIONAL_ID",
      idReference: "NIN-88291048291",
      releasedById: abiStaff.id,
      branchId: abiBranch.id,
      remarks: "Parcels inspected and released in sound condition.",
      collectionDate: new Date(Date.now() - 86400000),
    },
  });

  // Shipment 2: Ready for Pickup (in Abia)
  const s2 = await prisma.shipment.create({
    data: {
      waybillNumber: "PTL-PHC-ABI-260911-0002",
      originBranchId: phcBranch.id,
      destinationBranchId: abiBranch.id,
      senderId: customer3.id,
      receiverId: customer4.id,
      status: "READY_FOR_PICKUP",
      parcelCategory: "Clothing",
      description: "5 Bundles Premium Hollandis & African Wax Textiles",
      packagesCount: 5,
      quantity: 5,
      weightKg: 18.0,
      declaredValue: 280000,
      transportCharge: 12000,
      paymentStatus: "PAID",
      paymentMethod: "TRANSFER",
      amountPaid: 12000,
      balanceAmount: 0,
      pickupCode: "583921",
      pickupCodeGeneratedAt: new Date(Date.now() - 86400000),
      currentBranchId: abiBranch.id,
      createdById: phcStaff.id,
      createdAt: new Date(Date.now() - 2 * 86400000),
    },
  });

  await prisma.shipmentStatusHistory.createMany({
    data: [
      { shipmentId: s2.id, status: "CREATED", branchId: phcBranch.id, staffId: phcStaff.id, remarks: "Waybill registered", createdAt: new Date(Date.now() - 2 * 86400000) },
      { shipmentId: s2.id, status: "AWAITING_DISPATCH", branchId: phcBranch.id, staffId: phcStaff.id, remarks: "Staged for morning dispatch", createdAt: new Date(Date.now() - 2 * 86400000 + 1800000) },
      { shipmentId: s2.id, status: "DISPATCHED", branchId: phcBranch.id, staffId: phcAdmin.id, remarks: "Dispatched on MAN-PHC-ABI-260911-001", createdAt: new Date(Date.now() - 86400000) },
      { shipmentId: s2.id, status: "IN_TRANSIT", branchId: phcBranch.id, staffId: phcAdmin.id, remarks: "In transit to Aba", createdAt: new Date(Date.now() - 86400000 + 1800000) },
      { shipmentId: s2.id, status: "ARRIVED_AT_DESTINATION", branchId: abiBranch.id, staffId: abiStaff.id, remarks: "Arrived at Aba Hub, verified intact", createdAt: new Date(Date.now() - 86400000 + 14400000) },
      { shipmentId: s2.id, status: "READY_FOR_PICKUP", branchId: abiBranch.id, staffId: abiStaff.id, remarks: "Customer notified via SMS notification", createdAt: new Date(Date.now() - 86400000 + 15000000) },
    ],
  });

  await prisma.notification.create({
    data: {
      shipmentId: s2.id,
      recipientPhone: "08125678901",
      recipientName: "Chief Obinna Eze",
      channel: "SMS",
      message: "Your parcel with waybill PTL-PHC-ABI-260911-0002 has arrived at our Abia office and is ready for collection. Pickup Code: 583921. Please present this message at the counter.",
      sentAt: new Date(Date.now() - 86400000 + 15000000),
      deliveryStatus: "SENT",
    },
  });

  // Shipment 3: Ready for Pickup (in Abia)
  const s3 = await prisma.shipment.create({
    data: {
      waybillNumber: "PTL-PHC-ABI-260911-0003",
      originBranchId: phcBranch.id,
      destinationBranchId: abiBranch.id,
      senderId: customer6.id,
      receiverId: customer2.id,
      status: "READY_FOR_PICKUP",
      parcelCategory: "Documents",
      description: "Sealed Envelope - Certified Survey Plan & Deed of Conveyance",
      packagesCount: 1,
      quantity: 1,
      weightKg: 0.8,
      declaredValue: 50000,
      transportCharge: 4500,
      paymentStatus: "PAID",
      paymentMethod: "POS",
      amountPaid: 4500,
      balanceAmount: 0,
      pickupCode: "729104",
      pickupCodeGeneratedAt: new Date(Date.now() - 86400000),
      currentBranchId: abiBranch.id,
      createdById: phcStaff.id,
      createdAt: new Date(Date.now() - 2 * 86400000),
    },
  });

  await prisma.shipmentStatusHistory.createMany({
    data: [
      { shipmentId: s3.id, status: "CREATED", branchId: phcBranch.id, staffId: phcStaff.id, remarks: "Waybill registered", createdAt: new Date(Date.now() - 2 * 86400000) },
      { shipmentId: s3.id, status: "AWAITING_DISPATCH", branchId: phcBranch.id, staffId: phcStaff.id, remarks: "Staged for dispatch", createdAt: new Date(Date.now() - 2 * 86400000 + 3600000) },
      { shipmentId: s3.id, status: "DISPATCHED", branchId: phcBranch.id, staffId: phcAdmin.id, remarks: "Dispatched on MAN-PHC-ABI-260911-001", createdAt: new Date(Date.now() - 86400000) },
      { shipmentId: s3.id, status: "IN_TRANSIT", branchId: phcBranch.id, staffId: phcAdmin.id, remarks: "In transit", createdAt: new Date(Date.now() - 86400000 + 1800000) },
      { shipmentId: s3.id, status: "ARRIVED_AT_DESTINATION", branchId: abiBranch.id, staffId: abiStaff.id, remarks: "Arrived safely", createdAt: new Date(Date.now() - 86400000 + 14400000) },
      { shipmentId: s3.id, status: "READY_FOR_PICKUP", branchId: abiBranch.id, staffId: abiStaff.id, remarks: "Ready for pickup", createdAt: new Date(Date.now() - 86400000 + 15000000) },
    ],
  });

  // Shipment 4: In Transit (Abia to Port Harcourt)
  const s4 = await prisma.shipment.create({
    data: {
      waybillNumber: "PTL-ABI-PHC-260912-0001",
      originBranchId: abiBranch.id,
      destinationBranchId: phcBranch.id,
      senderId: customer4.id,
      receiverId: customer5.id,
      status: "IN_TRANSIT",
      parcelCategory: "Other",
      description: "3 Crates Toyota Auto Brake Pads & Shock Absorbers",
      packagesCount: 3,
      quantity: 3,
      weightKg: 32.0,
      declaredValue: 180000,
      transportCharge: 14500,
      paymentStatus: "PAID",
      paymentMethod: "TRANSFER",
      amountPaid: 14500,
      balanceAmount: 0,
      currentBranchId: abiBranch.id,
      createdById: abiStaff.id,
      createdAt: new Date(Date.now() - 12 * 3600000),
    },
  });

  // Create Manifest for In Transit shipment s4
  const manifest1 = await prisma.manifest.create({
    data: {
      manifestNumber: "MAN-ABI-PHC-260912-001",
      originBranchId: abiBranch.id,
      destinationBranchId: phcBranch.id,
      status: "IN_TRANSIT",
      driverName: "Sunday Okon",
      vehicleReg: "ABJ-452-XY (Hiace Van)",
      driverPhone: "08033334444",
      notes: "Morning interstate dispatch run",
      totalParcels: 1,
      createdById: abiStaff.id,
      dispatchedAt: new Date(Date.now() - 4 * 3600000),
      dispatchedById: abiAdmin.id,
    },
  });

  await prisma.manifestShipment.create({
    data: {
      manifestId: manifest1.id,
      shipmentId: s4.id,
      receivingStatus: "PENDING",
    },
  });

  await prisma.shipmentStatusHistory.createMany({
    data: [
      { shipmentId: s4.id, status: "CREATED", branchId: abiBranch.id, staffId: abiStaff.id, remarks: "Waybill registered in Aba", createdAt: new Date(Date.now() - 12 * 3600000) },
      { shipmentId: s4.id, status: "AWAITING_DISPATCH", branchId: abiBranch.id, staffId: abiStaff.id, remarks: "Grouped into manifest", createdAt: new Date(Date.now() - 6 * 3600000) },
      { shipmentId: s4.id, status: "DISPATCHED", branchId: abiBranch.id, staffId: abiAdmin.id, remarks: "Dispatched with Driver Sunday Okon", createdAt: new Date(Date.now() - 4 * 3600000) },
      { shipmentId: s4.id, status: "IN_TRANSIT", branchId: abiBranch.id, staffId: abiAdmin.id, remarks: "En route to Port Harcourt Office", createdAt: new Date(Date.now() - 4 * 3600000) },
    ],
  });

  // Shipment 5: Awaiting Dispatch (Port Harcourt to Abia)
  const s5 = await prisma.shipment.create({
    data: {
      waybillNumber: "PTL-PHC-ABI-260912-0001",
      originBranchId: phcBranch.id,
      destinationBranchId: abiBranch.id,
      senderId: customer1.id,
      receiverId: customer4.id,
      status: "AWAITING_DISPATCH",
      parcelCategory: "Other",
      description: "3 Boxes Diagnostic Rapid Test Kits & Laboratory Reagents",
      packagesCount: 3,
      quantity: 3,
      weightKg: 9.5,
      declaredValue: 220000,
      transportCharge: 15000,
      paymentStatus: "PAID",
      paymentMethod: "TRANSFER",
      amountPaid: 15000,
      balanceAmount: 0,
      currentBranchId: phcBranch.id,
      createdById: phcStaff.id,
      createdAt: new Date(Date.now() - 2 * 3600000),
    },
  });

  await prisma.shipmentStatusHistory.createMany({
    data: [
      { shipmentId: s5.id, status: "CREATED", branchId: phcBranch.id, staffId: phcStaff.id, remarks: "Registered at PHC counter", createdAt: new Date(Date.now() - 2 * 3600000) },
      { shipmentId: s5.id, status: "AWAITING_DISPATCH", branchId: phcBranch.id, staffId: phcStaff.id, remarks: "Awaiting next scheduled manifest", createdAt: new Date(Date.now() - 2 * 3600000 + 600000) },
    ],
  });

  // Shipment 6: Awaiting Dispatch (Port Harcourt to Abia)
  const s6 = await prisma.shipment.create({
    data: {
      waybillNumber: "PTL-PHC-ABI-260912-0002",
      originBranchId: phcBranch.id,
      destinationBranchId: abiBranch.id,
      senderId: customer5.id,
      receiverId: customer2.id,
      status: "AWAITING_DISPATCH",
      parcelCategory: "Food Items",
      description: "2 Sacks Dried Catfish, Crayfish & Native Pepper Soup Spices",
      packagesCount: 2,
      quantity: 2,
      weightKg: 14.0,
      declaredValue: 90000,
      transportCharge: 8000,
      paymentStatus: "PAID",
      paymentMethod: "CASH",
      amountPaid: 8000,
      balanceAmount: 0,
      currentBranchId: phcBranch.id,
      createdById: phcStaff.id,
      createdAt: new Date(Date.now() - 1 * 3600000),
    },
  });

  await prisma.shipmentStatusHistory.createMany({
    data: [
      { shipmentId: s6.id, status: "CREATED", branchId: phcBranch.id, staffId: phcStaff.id, remarks: "Registered at PHC counter", createdAt: new Date(Date.now() - 1 * 3600000) },
      { shipmentId: s6.id, status: "AWAITING_DISPATCH", branchId: phcBranch.id, staffId: phcStaff.id, remarks: "Staged in Outgoing Bay", createdAt: new Date(Date.now() - 1 * 3600000 + 300000) },
    ],
  });

  // Sequence Counters
  await prisma.sequenceCounter.createMany({
    data: [
      { type: "WAYBILL", prefix: "PTL-PHC-ABI-260910", currentNumber: 1 },
      { type: "WAYBILL", prefix: "PTL-PHC-ABI-260911", currentNumber: 3 },
      { type: "WAYBILL", prefix: "PTL-ABI-PHC-260912", currentNumber: 1 },
      { type: "WAYBILL", prefix: "PTL-PHC-ABI-260912", currentNumber: 2 },
      { type: "MANIFEST", prefix: "MAN-ABI-PHC-260912", currentNumber: 1 },
    ],
  });

  // Seed Initial Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: superAdmin.id,
        userName: superAdmin.name,
        userEmail: superAdmin.email,
        userRole: superAdmin.role,
        action: "SYSTEM_INITIALIZED",
        entityType: "SETTING",
        entityId: "SYSTEM",
        branchId: phcBranch.id,
        branchCode: "PHC",
        details: "System successfully initialized with default Port Harcourt and Abia branch nodes.",
        createdAt: new Date(Date.now() - 4 * 86400000),
      },
      {
        userId: phcStaff.id,
        userName: phcStaff.name,
        userEmail: phcStaff.email,
        userRole: phcStaff.role,
        action: "WAYBILL_CREATED",
        entityType: "SHIPMENT",
        entityId: s5.id,
        branchId: phcBranch.id,
        branchCode: "PHC",
        details: "Created waybill PTL-PHC-ABI-260912-0001 (Medical Supplies)",
        newValue: JSON.stringify({ waybill: s5.waybillNumber, charge: s5.transportCharge }),
        createdAt: new Date(Date.now() - 2 * 3600000),
      },
      {
        userId: abiAdmin.id,
        userName: abiAdmin.name,
        userEmail: abiAdmin.email,
        userRole: abiAdmin.role,
        action: "MANIFEST_DISPATCHED",
        entityType: "MANIFEST",
        entityId: manifest1.id,
        branchId: abiBranch.id,
        branchCode: "ABI",
        details: "Dispatched manifest MAN-ABI-PHC-260912-001 with 1 parcel",
        createdAt: new Date(Date.now() - 4 * 3600000),
      },
    ],
  });

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
