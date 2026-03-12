import 'reflect-metadata';
import { AppDataSource } from '../config/database.config';
import { User } from '../entities/user.entity';
import { UserRole } from '../constants/roles.constant';
import { hashPassword } from '../utils/password.util';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin123';
const ADMIN_FULL_NAME = 'System Admin';

const SEED_USERS = [
  { email: 'a@gmail.com', password: 'a123456789', fullName: 'User A', role: UserRole.EMPLOYEE },
  { email: 'b@gmail.com', password: 'b123456789', fullName: 'User B', role: UserRole.EMPLOYEE },
  { email: 'c@gmail.com', password: 'c123456789', fullName: 'User C', role: UserRole.EMPLOYEE },
  { email: 'd@gmail.com', password: 'd123456789', fullName: 'User D', role: UserRole.DIRECTOR },
  { email: 'e@gmail.com', password: 'e123456789', fullName: 'User E', role: UserRole.DIRECTOR },
];

const seedAdmin = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const userRepo = AppDataSource.getRepository(User);

    // Seed admin
    const existingAdmin = await userRepo.findOne({ where: { email: ADMIN_EMAIL } });
    if (existingAdmin) {
      console.log('Admin user already exists, skipping');
    } else {
      const hashedPassword = await hashPassword(ADMIN_PASSWORD);
      const admin = userRepo.create({
        email: ADMIN_EMAIL,
        password: hashedPassword,
        fullName: ADMIN_FULL_NAME,
        role: UserRole.ADMIN,
        isActive: true,
      });
      await userRepo.save(admin);
      console.log(`Created admin: ${ADMIN_EMAIL}`);
    }

    // Seed users a-e
    for (const userData of SEED_USERS) {
      const existing = await userRepo.findOne({ where: { email: userData.email } });
      if (existing) {
        console.log(`User ${userData.email} already exists, skipping`);
        continue;
      }
      const hashedPassword = await hashPassword(userData.password);
      const user = userRepo.create({
        email: userData.email,
        password: hashedPassword,
        fullName: userData.fullName,
        role: userData.role,
        isActive: true,
      });
      await userRepo.save(user);
      console.log(`Created user: ${userData.email} (${userData.role})`);
    }

    await AppDataSource.destroy();
    console.log('Seed completed');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seedAdmin();
