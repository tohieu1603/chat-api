import 'reflect-metadata';
import { AppDataSource } from '../config/database.config';
import { User } from '../entities/user.entity';
import { Company } from '../entities/company.entity';
import { UserRole } from '../constants/roles.constant';
import { hashPassword } from '../utils/password.util';

const seedAdmin = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const userRepo = AppDataSource.getRepository(User);
    const companyRepo = AppDataSource.getRepository(Company);

    // Seed companies
    const companies = [
      { name: 'Company A', description: 'First company' },
      { name: 'Company B', description: 'Second company' },
    ];

    const companyMap: Record<string, Company> = {};
    for (const c of companies) {
      let company = await companyRepo.findOne({ where: { name: c.name } });
      if (!company) {
        company = companyRepo.create(c);
        company = await companyRepo.save(company);
        console.log(`Created company: ${c.name}`);
      } else {
        console.log(`Company ${c.name} already exists, skipping`);
      }
      companyMap[c.name] = company;
    }

    // Seed users: admin (no company), managers + employees per company
    const seedUsers = [
      // Admin - no company
      { email: 'admin@gmail.com', password: 'admin123', fullName: 'System Admin', role: UserRole.ADMIN, position: 'System Administrator', company: null },
      // Company A: manager + employees
      { email: 'a@gmail.com', password: 'a123456789', fullName: 'Manager A', role: UserRole.MANAGER, position: 'Quản lý Company A', company: 'Company A' },
      { email: 'b@gmail.com', password: 'b123456789', fullName: 'User B', role: UserRole.DIRECTOR, position: 'Giám đốc kinh doanh', company: 'Company A' },
      { email: 'c@gmail.com', password: 'c123456789', fullName: 'User C', role: UserRole.EMPLOYEE, position: 'Nhân viên kỹ thuật', company: 'Company A' },
      // Company B: manager + employees
      { email: 'd@gmail.com', password: 'd123456789', fullName: 'Manager D', role: UserRole.MANAGER, position: 'Quản lý Company B', company: 'Company B' },
      { email: 'e@gmail.com', password: 'e123456789', fullName: 'User E', role: UserRole.DIRECTOR, position: 'Giám đốc sản xuất', company: 'Company B' },
    ];

    for (const u of seedUsers) {
      const existing = await userRepo.findOne({ where: { email: u.email } });
      if (existing) {
        console.log(`User ${u.email} already exists, skipping`);
        continue;
      }
      const hashedPassword = await hashPassword(u.password);
      const user = userRepo.create({
        email: u.email,
        password: hashedPassword,
        fullName: u.fullName,
        role: u.role,
        position: u.position,
        companyId: u.company ? companyMap[u.company].id : null,
        isActive: true,
      });
      await userRepo.save(user);
      console.log(`Created user: ${u.email} (${u.role}${u.company ? `, ${u.company}` : ''})`);
    }

    await AppDataSource.destroy();
    console.log('Seed completed');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seedAdmin();
