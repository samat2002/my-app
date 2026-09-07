import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/auth';

async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  const password = args[1];
  const name = args[2] || 'Admin';
  const role = args[3] || 'admin';

  if (!email || !password) {
    console.log('Usage: npx tsx scripts/create-user.ts <email> <password> [name] [role]');
    console.log('Example: npx tsx scripts/create-user.ts admin@example.com password123 "Admin User" admin');
    process.exit(1);
  }

  const hashedPassword = await hashPassword(password);

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log(`User ${email} already exists! Updating password...`);
    const updated = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        name,
        role,
      },
    });
    console.log(`Updated user:`, { id: updated.id, email: updated.email, role: updated.role });
  } else {
    const created = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    });
    console.log(`Created user:`, { id: created.id, email: created.email, role: created.role });
  }
}

main()
  .catch((e) => {
    console.error('Error creating user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
