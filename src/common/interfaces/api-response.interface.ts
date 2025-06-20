export interface ApiResponse<T> {
  code: number;
  data: T;
  errorMessage: string | null;
}

export interface Page<T> {
  content: T[];
  pageNum: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}
