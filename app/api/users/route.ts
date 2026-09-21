export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';
import { hashPassword } from '@lib/auth';

// GET all users (never expose password hash)
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    console.error('GET /api/users error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check for duplicate email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    const hashed = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name: name || null,
        role: role || 'user',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/users error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - update user by id
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email, password, name, role } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    // Check if new email conflicts with another user
    if (email) {
      const conflict = await prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (conflict) {
        return NextResponse.json(
          { success: false, error: 'Another user with this email already exists' },
          { status: 409 }
        );
      }
    }

    const updateData: any = {};
    if (email) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (role) updateData.role = role;
    if (password) updateData.password = await hashPassword(password);

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error('PUT /api/users error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - delete user by id
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /api/users error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
