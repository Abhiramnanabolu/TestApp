export interface Test {
    id: string;
    title: string;
    description?: string | null;
    createdBy: string;
    availabilityStart: Date;
    availabilityEnd: Date;
    totalDuration: number;
  
    shuffleQuestions: boolean;
    allowSectionNav: boolean;
    negativeMarking: boolean;
    showResultsInstant: boolean;
  
    status: "draft" | "published";
    createdAt: Date;
    updatedAt: Date;
  
    // relations
    creator?: User;
    sections?: Section[];
    invitations?: TestInvitation[];
  }
  
  export interface Section {
    id: string;
    title: string;
    duration?: number | null;
    testId: string;
  
    // relations
    test?: Test;
    questions?: Question[];
  }
  
  export type QuestionType = "mcq" | "text" | "multi-select";
  
  export interface Question {
    id: string;
    type: QuestionType;
    text: string;
    sectionId: string;
  
    // relations
    section?: Section;
    options?: Option[];
  }
  
  export interface Option {
    id: string;
    text: string;
    isCorrect: boolean;
    questionId: string;
  
    // relations
    question?: Question;
  }
  
  export type InvitationStatus = "pending" | "accepted" | "completed";
  
  export interface TestInvitation {
    id: string;
    email: string;
    testId: string;
    status: InvitationStatus;
  
    // relations
    test?: Test;
  }
  
  export interface User {
    id: string;
    email: string;
    name?: string | null;
    createdAt: Date;
    updatedAt: Date;
  
    // relations
    testsCreated?: Test[];
    invitations?: TestInvitation[];
  }
  