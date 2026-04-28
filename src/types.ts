export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedAt: string;
}

export interface Member {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  birthDate?: string;
  joinDate?: string;
  isBaptized?: boolean;
  baptismDate?: string;
  bloodType?: string;
  allergies?: string;
  observations?: string;
  photoUrl?: string;
  status: 'active' | 'inactive';
  attachments?: Attachment[];
}

export interface EventPhase {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

export interface ChurchEvent {
  id?: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  price: number;
  maxParticipants?: number;
  publicId: string;
  imageUrl?: string;
  attachments?: Attachment[];
  phases?: EventPhase[];
  pixKey?: string;
  paymentLink?: string;
}

export interface EventType {
  id?: string;
  name: string;
}

export interface Registration {
  id?: string;
  eventId: string;
  name: string;
  phone: string;
  isMember: boolean;
  memberId?: string;
  cpf?: string;
  address?: string;
  birthDate?: string;
  isMinor?: boolean;
  guardianAuthorization?: Attachment;
  emergencyContacts?: {
    name1: string;
    phone1: string;
    name2: string;
    phone2: string;
  };
  bloodType?: string;
  allergies?: string;
  medications?: string;
  observations?: string;
  status: 'pending' | 'paid';
  amountPaid: number;
  paymentMethod?: 'pix' | 'cash' | 'card';
  registeredAt?: string;
  updatedAt?: string;
  email?: string;
}

export interface ChurchSettings {
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
  };
  pixKey?: string;
  announcement?: string;
  publicUrl?: string;
}

export interface EventTemplate {
  id?: string;
  name: string; // The name of the template itself
  title: string;
  type: string;
  location: string;
  description: string;
  price: number;
  maxParticipants?: number;
  createdAt: string;
  phases?: EventPhase[];
  pixKey?: string;
  paymentLink?: string;
}

export interface AccessRequest {
  id?: string;
  email: string;
  name: string;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
}
