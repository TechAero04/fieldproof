const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding FieldProof V2 Multi-Tenant Enterprise Database ---');

  // Clean existing tables in proper relational order
  await prisma.offlineSyncOperation.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.report.deleteMany();
  await prisma.inspectionReview.deleteMany();
  await prisma.correctiveActionComment.deleteMany();
  await prisma.correctiveAction.deleteMany();
  await prisma.evidenceFile.deleteMany();
  await prisma.finding.deleteMany();
  await prisma.signature.deleteMany();
  await prisma.gPSRecord.deleteMany();
  await prisma.inspectionResponse.deleteMany();
  await prisma.inspectionAssignment.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.templateQuestion.deleteMany();
  await prisma.templateSection.deleteMany();
  await prisma.templateVersion.deleteMany();
  await prisma.inspectionTemplate.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.site.deleteMany();
  await prisma.team.deleteMany();
  await prisma.department.deleteMany();
  await prisma.organizationMembership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  console.log('✓ Cleaned existing database records');

  // 1. Create Multi-Tenant Organizations
  const orgApex = await prisma.organization.create({
    data: {
      name: 'Apex Global Logistics',
      slug: 'apex-logistics',
      industry: 'Logistics & Warehousing',
      website: 'https://apexlogistics.example.com',
      phone: '+1 (555) 100-2000',
      address: '1040 Logistics Blvd, Dallas, TX 75201',
      status: 'ACTIVE',
      plan: 'ENTERPRISE',
    },
  });

  const orgTitan = await prisma.organization.create({
    data: {
      name: 'Titan Heavy Manufacturing',
      slug: 'titan-manufacturing',
      industry: 'Industrial Manufacturing',
      website: 'https://titanmfg.example.com',
      phone: '+1 (555) 200-3000',
      address: '450 Industrial Parkway, Detroit, MI 48201',
      status: 'ACTIVE',
      plan: 'ENTERPRISE',
    },
  });

  console.log('✓ Created 2 Multi-Tenant Organizations: Apex Global Logistics & Titan Heavy Manufacturing');

  // 2. Create Global Users with Secure Passwords
  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  const managerPasswordHash = await bcrypt.hash('admin123', 10);
  const inspectorPasswordHash = await bcrypt.hash('inspector123', 10);

  // Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      name: 'Elena Rostova',
      email: 'superadmin@fieldproof.com',
      passwordHash: managerPasswordHash,
      isSuperAdmin: true,
      title: 'Global Platform Administrator',
      phone: '+1 (555) 000-0001',
    },
  });

  // Apex Users
  const apexManager = await prisma.user.create({
    data: {
      name: 'Alex Morgan',
      email: 'manager@fieldproof.com',
      passwordHash: managerPasswordHash,
      title: 'Compliance Director',
      phone: '+1 (555) 234-5678',
    },
  });

  const apexInspector = await prisma.user.create({
    data: {
      name: 'Marcus Vance',
      email: 'inspector@fieldproof.com',
      passwordHash: inspectorPasswordHash,
      title: 'Senior Field Safety Inspector',
      phone: '+1 (555) 876-5432',
    },
  });

  const apexAssignee = await prisma.user.create({
    data: {
      name: 'Sarah Jenkins',
      email: 'assignee@fieldproof.com',
      passwordHash: defaultPasswordHash,
      title: 'Maintenance Lead & CAPA Specialist',
      phone: '+1 (555) 345-6789',
    },
  });

  const apexAuditor = await prisma.user.create({
    data: {
      name: 'David Chen',
      email: 'auditor@fieldproof.com',
      passwordHash: defaultPasswordHash,
      title: 'Certified ISO 45001 External Auditor',
      phone: '+1 (555) 456-7890',
    },
  });

  // Titan Users
  const titanAdmin = await prisma.user.create({
    data: {
      name: 'Robert Kowalski',
      email: 'titan.admin@titanmfg.com',
      passwordHash: managerPasswordHash,
      title: 'Plant Safety Manager',
      phone: '+1 (555) 987-6543',
    },
  });

  const titanInspector = await prisma.user.create({
    data: {
      name: 'James Reynolds',
      email: 'titan.inspector@titanmfg.com',
      passwordHash: inspectorPasswordHash,
      title: 'Equipment Quality Technician',
      phone: '+1 (555) 654-3210',
    },
  });

  // 3. Establish Multi-Tenant Memberships
  // Apex Memberships
  await prisma.organizationMembership.createMany({
    data: [
      { userId: superAdmin.id, organizationId: orgApex.id, role: 'SUPER_ADMIN', title: 'Platform Superadmin' },
      { userId: apexManager.id, organizationId: orgApex.id, role: 'ORG_ADMIN', title: 'Compliance Director' },
      { userId: apexInspector.id, organizationId: orgApex.id, role: 'INSPECTOR', title: 'Field Inspector' },
      { userId: apexAssignee.id, organizationId: orgApex.id, role: 'ASSIGNEE', title: 'Maintenance Lead' },
      { userId: apexAuditor.id, organizationId: orgApex.id, role: 'AUDITOR', title: 'Compliance Auditor' },
    ],
  });

  // Titan Memberships
  await prisma.organizationMembership.createMany({
    data: [
      { userId: superAdmin.id, organizationId: orgTitan.id, role: 'SUPER_ADMIN', title: 'Platform Superadmin' },
      { userId: titanAdmin.id, organizationId: orgTitan.id, role: 'ORG_ADMIN', title: 'Plant Safety Manager' },
      { userId: titanInspector.id, organizationId: orgTitan.id, role: 'INSPECTOR', title: 'Technician' },
    ],
  });

  console.log('✓ Created 7 Users & Role Memberships across tenants');

  // 4. Physical Sites & Geofences
  const apexSite1 = await prisma.site.create({
    data: {
      organizationId: orgApex.id,
      name: 'Apex Central Distribution Hub',
      code: 'DAL-WH-04',
      address: '1040 Logistics Blvd',
      city: 'Dallas',
      state: 'TX',
      country: 'USA',
      latitude: 32.7767,
      longitude: -96.7970,
      contactName: 'Carlos Mendoza',
      contactPhone: '+1 (555) 234-1111',
      contactEmail: 'carlos.m@apexlogistics.example.com',
      isActive: true,
    },
  });

  const apexSite2 = await prisma.site.create({
    data: {
      organizationId: orgApex.id,
      name: 'Apex West Coast Intermodal Terminal',
      code: 'LAX-TM-02',
      address: '2200 Ocean Terminal Way',
      city: 'Long Beach',
      state: 'CA',
      country: 'USA',
      latitude: 33.7701,
      longitude: -118.1937,
      contactName: 'Brenda Lawson',
      contactPhone: '+1 (555) 345-2222',
      contactEmail: 'brenda.l@apexlogistics.example.com',
      isActive: true,
    },
  });

  const titanSite = await prisma.site.create({
    data: {
      organizationId: orgTitan.id,
      name: 'Titan Heavy Foundry & Assembly Plant',
      code: 'DET-PL-01',
      address: '450 Industrial Parkway',
      city: 'Detroit',
      state: 'MI',
      country: 'USA',
      latitude: 42.3314,
      longitude: -83.0458,
      contactName: 'Frank Miller',
      contactPhone: '+1 (555) 456-3333',
      isActive: true,
    },
  });

  console.log('✓ Created 3 Physical Facility Sites with Geocoordinates');

  // 5. Scannable Physical Assets (with QR code asset tags)
  const assetConveyor = await prisma.asset.create({
    data: {
      organizationId: orgApex.id,
      siteId: apexSite1.id,
      name: 'High-Speed Automated Sorter Conveyor',
      assetTag: 'AST-APX-001',
      category: 'Material Conveyor',
      modelNumber: 'Dematic FlexSort 2024',
      serialNumber: 'SRT-99824-TX',
      locationInSite: 'Sorting Bay 3, Ground Floor',
      status: 'OPERATIONAL',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=AST-APX-001',
    },
  });

  const assetGenerator = await prisma.asset.create({
    data: {
      organizationId: orgApex.id,
      siteId: apexSite1.id,
      name: 'Emergency Backup Diesel Generator 500kW',
      assetTag: 'AST-APX-002',
      category: 'Emergency Generator',
      modelNumber: 'Cummins QSK19-G8',
      serialNumber: 'CUM-2022-771',
      locationInSite: 'Exterior Power Vault West',
      status: 'OPERATIONAL',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=AST-APX-002',
    },
  });

  const assetChiller = await prisma.asset.create({
    data: {
      organizationId: orgApex.id,
      siteId: apexSite2.id,
      name: 'Commercial Roof Chiller Unit #1',
      assetTag: 'AST-APX-003',
      category: 'HVAC System',
      modelNumber: 'Carrier AquaForce 30XA',
      serialNumber: 'CAR-4491-LA',
      locationInSite: 'Roof Deck Sector A',
      status: 'OPERATIONAL',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=AST-APX-003',
    },
  });

  console.log('✓ Registered Physical Assets with scannable QR tags');

  // 6. Inspection Templates with Versioning & Question Types
  const tplSafety = await prisma.inspectionTemplate.create({
    data: {
      organizationId: orgApex.id,
      title: 'OSHA Commercial Facility Safety & Fire Compliance',
      description: 'Comprehensive assessment of egress routes, fire suppression devices, electrical hazard controls, and worker PPE adherence.',
      category: 'Fire & Safety',
      currentVersion: 1,
      isActive: true,
      createdById: apexManager.id,
      versions: {
        create: {
          version: 1,
          title: 'OSHA Commercial Facility Safety & Fire Compliance',
          description: 'Version 1.0 - Baselined against OSHA 1910 General Industry Standards.',
          isPublished: true,
          sections: {
            create: [
              {
                title: 'Emergency Exits & Evacuation Routes',
                description: 'Evaluate physical clearance, illumination, and signage for safe exit paths.',
                orderIndex: 0,
                questions: {
                  create: [
                    {
                      questionText: 'Are all emergency exit doors clearly marked with illuminated exit signs and completely unobstructed?',
                      questionType: 'PASS_FAIL_NA',
                      isRequired: true,
                      requirePhoto: true,
                      helpText: 'Exits must have at least 28 inches of continuous clear opening.',
                      orderIndex: 0,
                    },
                    {
                      questionText: 'Are emergency fire doors self-closing and latched properly without propping wedges?',
                      questionType: 'PASS_FAIL_NA',
                      isRequired: true,
                      requirePhoto: false,
                      helpText: 'Doors must not be held open by unapproved wedges or ties.',
                      orderIndex: 1,
                    },
                    {
                      questionText: 'Is the official floor evacuation map posted and legible at this station?',
                      questionType: 'YES_NO',
                      isRequired: true,
                      requirePhoto: false,
                      orderIndex: 2,
                    },
                  ],
                },
              },
              {
                title: 'Fire Suppression & Electrical Equipment',
                description: 'Verify inspection tags, gauge pressure, and electrical clearances.',
                orderIndex: 1,
                questions: {
                  create: [
                    {
                      questionText: 'Are all portable fire extinguishers inspected, tagged within 12 months, and pressure gauges in the green operating zone?',
                      questionType: 'PASS_FAIL_NA',
                      isRequired: true,
                      requirePhoto: true,
                      helpText: 'Extinguishers must be mounted no higher than 5 feet from the floor.',
                      orderIndex: 0,
                    },
                    {
                      questionText: 'Is a minimum of 36 inches clear working space maintained in front of all electrical disconnects and panelboards?',
                      questionType: 'PASS_FAIL_NA',
                      isRequired: true,
                      requirePhoto: false,
                      helpText: 'OSHA 1910.303(g) requires dedicated clearance without storage.',
                      orderIndex: 1,
                    },
                    {
                      questionText: 'Measured ambient temperature in main electrical distribution vault (°F):',
                      questionType: 'MEASUREMENT',
                      isRequired: false,
                      requirePhoto: false,
                      helpText: 'Optimal room operating range is between 65°F and 85°F.',
                      orderIndex: 2,
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    },
    include: {
      versions: {
        include: {
          sections: {
            include: { questions: true },
          },
        },
      },
    },
  });

  const safetyVersion = tplSafety.versions[0];
  const qExits = safetyVersion.sections[0].questions[0];
  const qDoors = safetyVersion.sections[0].questions[1];
  const qMap = safetyVersion.sections[0].questions[2];
  const qExtinguishers = safetyVersion.sections[1].questions[0];
  const qPanels = safetyVersion.sections[1].questions[1];
  const qTemp = safetyVersion.sections[1].questions[2];

  console.log('✓ Created Inspection Template with Version 1 and multiple question types');

  // 7. Seed Complete Workflows:
  // Inspection 1: Approved Exemplary Inspection
  const insp1 = await prisma.inspection.create({
    data: {
      organizationId: orgApex.id,
      title: 'Q4 Annual Comprehensive Fire Safety & Egress Audit',
      description: 'Scheduled annual compliance walk-through of the main distribution center.',
      templateId: tplSafety.id,
      templateVersionId: safetyVersion.id,
      siteId: apexSite1.id,
      inspectorId: apexInspector.id,
      createdById: apexManager.id,
      priority: 'HIGH',
      status: 'APPROVED',
      siteName: apexSite1.name,
      siteAddress: apexSite1.address,
      dueDate: new Date(Date.now() - 3 * 86400000),
      startedAt: new Date(Date.now() - 5 * 86400000),
      submittedAt: new Date(Date.now() - 4 * 86400000),
      reviewedAt: new Date(Date.now() - 3 * 86400000),
      complianceScore: 100,
      responses: {
        create: [
          { questionId: qExits.id, status: 'PASS', notes: 'All 6 primary exit corridors clear and illuminated.' },
          { questionId: qDoors.id, status: 'PASS', notes: 'Hydraulic door closers inspected and tension verified.' },
          { questionId: qMap.id, status: 'YES', notes: 'Updated 2026 evacuation blueprint visible.' },
          { questionId: qExtinguishers.id, status: 'PASS', notes: 'Tags stamped by certified contractor Oct 2026.' },
          { questionId: qPanels.id, status: 'PASS', notes: 'Floor yellow safety boundaries painted and clear.' },
          { questionId: qTemp.id, status: 'PASS', numberValue: 72.4, notes: 'HVAC airflow nominal.' },
        ],
      },
      gpsRecords: {
        create: {
          latitude: 32.7768,
          longitude: -96.7971,
          accuracy: 4.2,
          address: '1040 Logistics Blvd, Dallas, TX',
          distanceFromSite: 14,
          isWithinGeofence: true,
        },
      },
      signatures: {
        create: {
          signerName: 'Marcus Vance',
          signerType: 'INSPECTOR',
          signerTitle: 'Lead Field Inspector',
          signatureDataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><path d="M10 40 Q 50 10 90 40 T 170 30" stroke="black" stroke-width="2" fill="none"/></svg>',
        },
      },
      reviews: {
        create: {
          reviewerId: apexManager.id,
          status: 'APPROVED',
          feedback: 'Audit executed thoroughly with complete evidence. Certificate issued and filed for OSHA inspection record.',
        },
      },
    },
  });

  // Inspection 2: Submitted with Identified Deficiency & CAPA Remediation
  const insp2 = await prisma.inspection.create({
    data: {
      organizationId: orgApex.id,
      title: 'Bi-Weekly Sorting Conveyor Safety & Emergency Stop Audit',
      description: 'Physical inspection of mechanical guarding and emergency pull-cords on automated sorter.',
      templateId: tplSafety.id,
      templateVersionId: safetyVersion.id,
      siteId: apexSite1.id,
      assetId: assetConveyor.id,
      inspectorId: apexInspector.id,
      createdById: apexManager.id,
      priority: 'CRITICAL',
      status: 'SUBMITTED',
      siteName: apexSite1.name,
      siteAddress: apexSite1.address,
      dueDate: new Date(Date.now() + 2 * 86400000),
      startedAt: new Date(Date.now() - 1 * 86400000),
      submittedAt: new Date(),
      complianceScore: 80,
      responses: {
        create: [
          { questionId: qExits.id, status: 'PASS', notes: 'Perimeter walkway clear of pallet debris.' },
          { questionId: qDoors.id, status: 'PASS', notes: 'Conveyor fire damper door mechanism intact.' },
          { questionId: qMap.id, status: 'YES', notes: 'Station map legible.' },
          { questionId: qExtinguishers.id, status: 'PASS', notes: 'CO2 extinguisher charged at Bay 3.' },
          { questionId: qPanels.id, status: 'FAIL', notes: 'Excess pallet staging positioned within 18 inches of main motor disconnect switch.' },
        ],
      },
      gpsRecords: {
        create: {
          latitude: 32.7766,
          longitude: -96.7969,
          accuracy: 5.0,
          address: '1040 Logistics Blvd, Dallas, TX',
          distanceFromSite: 18,
          isWithinGeofence: true,
        },
      },
      signatures: {
        create: {
          signerName: 'Marcus Vance',
          signerType: 'INSPECTOR',
          signerTitle: 'Lead Field Inspector',
          signatureDataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><path d="M10 35 Q 60 15 100 35 T 180 25" stroke="black" stroke-width="2" fill="none"/></svg>',
        },
      },
    },
  });

  // Create Finding for Inspection 2
  const finding1 = await prisma.finding.create({
    data: {
      organizationId: orgApex.id,
      inspectionId: insp2.id,
      questionId: qPanels.id,
      siteId: apexSite1.id,
      assetId: assetConveyor.id,
      findingCode: 'FND-2026-0001',
      title: 'Electrical Disconnect Clearance Violation at Sorter Bay 3',
      description: 'Pallet staging obstructed the 36-inch required working clearance in front of the main 480V conveyor drive motor disconnect switch.',
      severity: 'HIGH',
      riskCategory: 'Electrical Safety',
      recommendation: 'Remove stacked pallets immediately, restripe floor hazard perimeter, and train staging personnel.',
      status: 'CAPA_CREATED',
    },
  });

  // Create Corrective Action (CAPA) linked to Finding
  const capa1 = await prisma.correctiveAction.create({
    data: {
      organizationId: orgApex.id,
      inspectionId: insp2.id,
      findingId: finding1.id,
      siteId: apexSite1.id,
      actionCode: 'CAPA-2026-0001',
      title: 'Clear Obstruction & Re-stripe 36-Inch Electrical Clearance Perimeter',
      description: 'Relocate pallet staging zone to designated bay 4. Paint reflective yellow safety boundary in front of 480V disconnect panel and install "DO NOT BLOCK" signage.',
      priority: 'HIGH',
      status: 'ASSIGNED',
      assigneeId: apexAssignee.id,
      dueDate: new Date(Date.now() + 5 * 86400000),
      comments: {
        create: [
          {
            userId: apexManager.id,
            comment: 'Assigned to Sarah Jenkins. Please clear immediately before the night shift begins.',
          },
          {
            userId: apexAssignee.id,
            comment: 'Work order dispatched to facilities crew. Yellow floor striping scheduled for 14:00 today.',
          },
        ],
      },
    },
  });

  // Inspection 3: Assigned to Inspector
  await prisma.inspection.create({
    data: {
      organizationId: orgApex.id,
      title: 'West Coast Intermodal Facility Monthly Environmental & Safety Check',
      description: 'Routine monthly audit of perimeter security, stormwater drain covers, and chiller efficiency.',
      templateId: tplSafety.id,
      templateVersionId: safetyVersion.id,
      siteId: apexSite2.id,
      assetId: assetChiller.id,
      inspectorId: apexInspector.id,
      createdById: apexManager.id,
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      siteName: apexSite2.name,
      siteAddress: apexSite2.address,
      dueDate: new Date(Date.now() + 7 * 86400000),
    },
  });

  console.log('✓ Created 3 Realistic Field Inspections with Findings and CAPA Remediation');

  // 8. Seed Audit Logs & In-App Notifications
  await prisma.auditLog.createMany({
    data: [
      {
        organizationId: orgApex.id,
        userId: apexManager.id,
        action: 'INSPECTION_CREATED',
        entity: 'Inspection',
        entityId: insp1.id,
        details: `Manager Alex Morgan created and assigned "${insp1.title}" to Marcus Vance`,
      },
      {
        organizationId: orgApex.id,
        userId: apexInspector.id,
        inspectionId: insp1.id,
        action: 'INSPECTION_SUBMITTED',
        entity: 'Inspection',
        entityId: insp1.id,
        details: 'Inspector Marcus Vance submitted inspection with 100% compliance score',
      },
      {
        organizationId: orgApex.id,
        userId: apexManager.id,
        inspectionId: insp1.id,
        action: 'INSPECTION_APPROVED',
        entity: 'Inspection',
        entityId: insp1.id,
        details: 'Manager Alex Morgan approved inspection and issued official audit report',
      },
      {
        organizationId: orgApex.id,
        userId: apexInspector.id,
        inspectionId: insp2.id,
        action: 'FINDING_CREATED',
        entity: 'Finding',
        entityId: finding1.id,
        details: 'Deficiency FND-2026-0001 flagged during inspection walk-through',
      },
      {
        organizationId: orgApex.id,
        userId: apexManager.id,
        inspectionId: insp2.id,
        action: 'CAPA_CREATED',
        entity: 'CorrectiveAction',
        entityId: capa1.id,
        details: 'Corrective Action CAPA-2026-0001 assigned to Sarah Jenkins',
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        organizationId: orgApex.id,
        userId: apexInspector.id,
        title: 'New Inspection Assigned',
        message: 'You have been assigned to conduct the West Coast Intermodal Facility check.',
        type: 'ASSIGNMENT',
        linkUrl: '/inspector/inspections',
        isRead: false,
      },
      {
        organizationId: orgApex.id,
        userId: apexAssignee.id,
        title: 'CAPA Action Assigned',
        message: 'You have been assigned CAPA-2026-0001: Clear Obstruction & Re-stripe Electrical Clearance.',
        type: 'CAPA',
        linkUrl: '/manager/capa',
        isRead: false,
      },
      {
        organizationId: orgApex.id,
        userId: apexManager.id,
        title: 'Audit Submitted with Deficiency',
        message: 'Conveyor Safety Audit submitted with 80% score (1 high-severity deficiency flagged).',
        type: 'REVIEW',
        linkUrl: `/manager/inspections/${insp2.id}`,
        isRead: false,
      },
    ],
  });

  console.log('✓ Seeded Audit Trail and Notifications');
  console.log('--- FieldProof V2 Database Seeding Successfully Completed ---');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
