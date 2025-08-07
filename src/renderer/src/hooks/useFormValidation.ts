import { useState, useCallback, useEffect } from 'react';
import { ValidationRule, validateField, validateForm, debounce } from '../utils/validation';

export interface UseFormValidationOptions<T> {
  initialValues: T;
  validationRules: Record<keyof T, ValidationRule>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

export interface UseFormValidationReturn<T> {
  values: T;
  errors: Record<keyof T, string | null>;
  touched: Record<keyof T, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  setValue: (field: keyof T, value: T[keyof T]) => void;
  setValues: (values: Partial<T>) => void;
  setError: (field: keyof T, error: string | null) => void;
  setTouched: (field: keyof T, touched?: boolean) => void;
  validateField: (field: keyof T) => void;
  validateForm: () => boolean;
  handleChange: (field: keyof T) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (field: keyof T) => (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => (event: React.FormEvent) => Promise<void>;
  reset: (newValues?: T) => void;
  setSubmitting: (isSubmitting: boolean) => void;
}

export const useFormValidation = <T extends Record<string, any>>({
  initialValues,
  validationRules,
  validateOnChange = true,
  validateOnBlur = true,
  debounceMs = 300,
}: UseFormValidationOptions<T>): UseFormValidationReturn<T> => {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrorsState] = useState<Record<keyof T, string | null>>(() => {
    const initialErrors = {} as Record<keyof T, string | null>;
    for (const key in initialValues) {
      initialErrors[key] = null;
    }
    return initialErrors;
  });
  const [touched, setTouchedState] = useState<Record<keyof T, boolean>>(() => {
    const initialTouched = {} as Record<keyof T, boolean>;
    for (const key in initialValues) {
      initialTouched[key] = false;
    }
    return initialTouched;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced validation function
  const debouncedValidateField = useCallback(
    debounce((field: keyof T, value: T[keyof T]) => {
      const rule = validationRules[field];
      if (rule) {
        const result = validateField(value, rule);
        setErrorsState(prev => ({
          ...prev,
          [field]: result.error,
        }));
      }
    }, debounceMs),
    [validationRules, debounceMs]
  );

  // Calculate if form is valid
  const isValid = Object.values(errors).every(error => error === null);

  const setValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setValuesState(prev => ({
      ...prev,
      [field]: value,
    }));

    if (validateOnChange && touched[field]) {
      debouncedValidateField(field, value);
    }
  }, [validateOnChange, touched, debouncedValidateField]);

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({
      ...prev,
      ...newValues,
    }));
  }, []);

  const setError = useCallback((field: keyof T, error: string | null) => {
    setErrorsState(prev => ({
      ...prev,
      [field]: error,
    }));
  }, []);

  const setTouched = useCallback((field: keyof T, isTouched = true) => {
    setTouchedState(prev => ({
      ...prev,
      [field]: isTouched,
    }));
  }, []);

  const validateFieldSync = useCallback((field: keyof T) => {
    const rule = validationRules[field];
    if (rule) {
      const result = validateField(values[field], rule);
      setErrorsState(prev => ({
        ...prev,
        [field]: result.error,
      }));
      return result.isValid;
    }
    return true;
  }, [values, validationRules]);

  const validateFormSync = useCallback(() => {
    const result = validateForm(values, validationRules);
    setErrorsState(result.fieldErrors);
    return result.isValid;
  }, [values, validationRules]);

  const handleChange = useCallback((field: keyof T) => {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { value, type, checked } = event.target as HTMLInputElement;
      const fieldValue = type === 'checkbox' ? checked : value;
      setValue(field, fieldValue as T[keyof T]);
    };
  }, [setValue]);

  const handleBlur = useCallback((field: keyof T) => {
    return (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setTouched(field, true);
      
      if (validateOnBlur) {
        validateFieldSync(field);
      }
    };
  }, [setTouched, validateOnBlur, validateFieldSync]);

  const handleSubmit = useCallback((onSubmit: (values: T) => void | Promise<void>) => {
    return async (event: React.FormEvent) => {
      event.preventDefault();
      
      // Mark all fields as touched
      const allTouched = {} as Record<keyof T, boolean>;
      for (const key in values) {
        allTouched[key] = true;
      }
      setTouchedState(allTouched);

      // Validate form
      const isFormValid = validateFormSync();
      
      if (isFormValid) {
        setIsSubmitting(true);
        try {
          await onSubmit(values);
        } catch (error) {
          console.error('Form submission error:', error);
        } finally {
          setIsSubmitting(false);
        }
      }
    };
  }, [values, validateFormSync]);

  const reset = useCallback((newValues?: T) => {
    const resetValues = newValues || initialValues;
    setValuesState(resetValues);
    
    const resetErrors = {} as Record<keyof T, string | null>;
    const resetTouched = {} as Record<keyof T, boolean>;
    for (const key in resetValues) {
      resetErrors[key] = null;
      resetTouched[key] = false;
    }
    setErrorsState(resetErrors);
    setTouchedState(resetTouched);
    setIsSubmitting(false);
  }, [initialValues]);

  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting);
  }, []);

  return {
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    setValue,
    setValues,
    setError,
    setTouched,
    validateField: validateFieldSync,
    validateForm: validateFormSync,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setSubmitting,
  };
};